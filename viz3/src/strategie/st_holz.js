// ===================== feat/strategie: the wood chain from above (STHOLZ) – from the forester's mark to the cutting board =====================
// The real chain (plan section 4): the forester marks → look at the forest (what one knows comes from someone who went there) → fell in
// winter, in the sap rest (course, two people, forest gear, daylight, no storm) → delimb, buck, measure → skid with the tractor and the
// winch, the stake trailer, home to the log yard → the band sawmill (petrol engine) → the drying stack (months, the moisture model of
// werk/holz_dry.js) → the workshop. Decided (brief, Falko 23:14): the family forest gives spruce, larch and pine – building timber for the
// pavilion, boards, firewood; Klingenholz boards are hardwood: oak glued panels bought (Euro) until a hardwood tree is there. Every job
// changes the world through the systems of the first-person game (FELL.simFell, HOLZ, HOLZSAW.simSaw, HOLZDRY.simStack, WERK.simBoard)
// – a tree felled from above is gone in the forest, its logs lie where it fell, the boards lie in the yard, the board on the shelf.
import { BUILD } from '../core/geo.js';
import { CLOCK } from '../time/clock.js';
import { FOREST } from '../world/forest.js';
import { FELL } from '../world/fell.js';
import { HOLZ } from '../werk/holz.js';
import { HOLZSAW } from '../werk/holz_saw.js';
import { HOLZDRY } from '../werk/holz_dry.js';
import { WERK } from '../werk/werk.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
import { STJOBS } from './st_jobs.js';
export const STHOLZ = (() => {
  const D = STDATA,
    C = STCORE,
    S = STRAT.S,
    W = STRAT.W,
    PR = D.PRICES;
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const SPN = { spruce: 'Fichte', larch: 'Lärche', pine: 'Kiefer' };
  const names = who => who.map(id => D.PEOPLE[id].name).join(' und ');
  // ---------------- where the wood is ----------------
  const yard = () => (HOLZ.YARD0 ? [HOLZ.YARD0.x, HOLZ.YARD0.y] : STRAT.place.pos('holzlager'));
  const inGarden = l => Math.hypot((l.p0[0] + l.p1[0]) / 2, (l.p0[1] + l.p1[1]) / 2) < 120;
  const logsForest = () => (HOLZ.logs || []).filter(l => l.st === 'ground' && l.p0 && !inGarden(l));
  const logsYard = () => (HOLZ.logs || []).filter(l => (l.st === 'ground' || l.st === 'saw') && l.p0 && inGarden(l));
  const fm = L => L.reduce((s, l) => s + (l.vol || 0), 0);
  // the marked trees that still stand (and are not under the saw of someone on foot)
  const marked = () =>
    (FELL.marked || []).filter(t => {
      const r = FELL.trees && FELL.trees[t.id];
      return !t.gone && (!r || r.st === 'plan') && FELL.job !== t.id;
    });
  const boardsPile = () => (HOLZSAW.boards || []).filter(b => b.st === 'pile');
  const boardsStack = () => (HOLZSAW.boards || []).filter(b => b.st === 'stack');
  const panels = (oak = true) =>
    ((WERK.RACK && WERK.RACK.items) || []).filter(w => w.st === 'panel' && (!oak || !w.sp));
  const panelHalves = () => panels(true).reduce((n, w) => n + (w.L >= 900 ? 2 : w.L >= 480 ? 1 : 0), 0);
  const shelf = (min = 0) =>
    ((WERK.SHELF && WERK.SHELF.items) || []).filter(
      w => w.done && w.where === 'shelf' && (w.stars || 0) >= min && !w.sp
    );
  // ---------------- the stocks of the places ----------------
  STRAT.place.define({
    id: 'klinge',
    stock: () => {
      const k = STRAT.known('wald', 'klinge');
      const L = logsForest();
      const out = [];
      if (!k) out.push(['Markierte Bäume', 'unbekannt – jemand muss hingehen']);
      else {
        out.push(['Markierte Bäume (Stand ' + W.day(k.t).label + ')', String(k.data.marked)]);
        out.push(['Davon stehen noch', String(marked().length)]);
        if (k.data.vol) out.push(['Geschätzt', '≈ ' + de(k.data.vol, 1) + ' fm']);
        if (k.data.kaefer) out.push(['Borkenkäfer', k.data.kaefer]);
      }
      out.push(['Stämme am Waldweg', L.length + ' · ' + de(fm(L), 2) + ' fm']);
      return out;
    },
    badge: () => {
      const L = logsForest();
      return L.length
        ? L.length + ' Stämme liegen'
        : STRAT.known('wald', 'klinge')
          ? marked().length + ' markiert'
          : '?';
    },
    missing: () => {
      const m = [];
      if (!STRAT.known('wald', 'klinge')) m.push('Wissen: niemand war in letzter Zeit dort (Waldbegang)');
      if (!Object.values(S.people).some(p => p.certs.includes('motorsaege')))
        m.push('Motorsägen-Lehrgang (nur Hubert hat ihn)');
      return m;
    },
  });
  STRAT.place.define({
    id: 'holzlager',
    stock: () => {
      const L = logsYard(),
        pile = boardsPile(),
        st = boardsStack(),
        ms = HOLZDRY.stackMC ? HOLZDRY.stackMC() : null;
      const out = [['Stämme im Lager', L.length + ' · ' + de(fm(L), 2) + ' fm']];
      out.push(['Bretter im Block (frisch)', String(pile.length)]);
      out.push(['Bretter im Trockenstapel', String(st.length)]);
      if (ms) {
        const d = ms.avg > 20 && HOLZDRY.forecast ? HOLZDRY.forecast(20) : 0;
        out.push([
          'Holzfeuchte im Stapel',
          de(ms.avg, 0) +
            ' %' +
            (ms.avg > 20 ? (d > 0 ? ' – lufttrocken in ≈ ' + d + ' Tagen' : '') : ' – lufttrocken'),
        ]);
      }
      out.push(['Schwarten (Brennholz)', String(HOLZSAW.fire || 0)]);
      return out;
    },
    badge: () => {
      const L = logsYard(),
        ms = HOLZDRY.stackMC ? HOLZDRY.stackMC() : null;
      return (L.length ? L.length + ' Stämme' : '') + (ms ? (L.length ? ' · ' : '') + de(ms.avg, 0) + ' % feucht' : '');
    },
  });
  STRAT.place.define({
    id: 'werkstatt',
    stock: () => {
      const f = W.fuel();
      return [
        ['Leimholz Eiche (Platten)', panels(true).length + ' (reicht für ' + panelHalves() + ' Bretter)'],
        ['Eigenes Leimholz (Lärche, Fichte)', String(panels(false).length - panels(true).length)],
        [
          'Fertige Schneidebretter im Regal',
          shelf().length +
            (shelf().length
              ? ' (' +
                shelf()
                  .map(w => w.stars + '★')
                  .join(' ') +
                ')'
              : ''),
        ],
        ['Aggregat (Benzin)', de(f.gen, 1) + ' von ' + f.genMax + ' l'],
        ['Powerstation', de(S.power.soc, 2) + ' kWh · PV ' + (S.power.pv || 0) + ' W'],
      ];
    },
    badge: () => {
      const n = shelf().length;
      return (n ? n + ' Bretter fertig' : '') + (WERK.W && WERK.W.order ? (n ? ' · ' : '') + 'Lieferung kommt' : '');
    },
    missing: () => {
      const m = [];
      if (!panelHalves()) m.push('Leimholz Eiche – bestellen (Lieferung um 9 Uhr)');
      if (W.fuel().can < 2) m.push('Benzin: der Kanister ist fast leer');
      return m;
    },
  });
  STRAT.place.define({
    id: 'schleusingen',
    name: 'Schleusingen',
    icon: '⛪',
    order: 90,
    pos: () => {
      const s = STRAT.W && window.KERN ? window.KERN.spot('schleusingen') : null;
      return s && s.pos ? s.pos.slice(0, 2) : [-1100.5, 1214.5];
    },
    sub: () => 'Lehrgänge, Holzhandel, Tankstelle, Markt',
  });
  // ---------------- 1 · look at the forest (exploration instead of a fog of war) ----------------
  STRAT.job.define({
    id: 'waldbegang',
    label: 'Waldbegang: nachsehen, was markiert ist',
    place: 'klinge',
    people: [1, 3],
    where: 'wald',
    heavy: 0.2,
    order: 5,
    text: 'Durch die Klinge gehen: die vom Förster markierten Bäume zählen, Holzmenge schätzen, nach Käferspuren und Sturmholz sehen.',
    learn:
      'Der Revierförster (ThüringenForst berät Privatwaldbesitzer) zeichnet hiebsreife, kranke oder bedrängte Bäume mit einem orangen Strich aus. Bohrmehl am Stammfuß und braune Nadeln sind Zeichen des Buchdruckers (Borkenkäfer).',
    dur: 75,
    can: cx => (cx.wx.storm ? 'sturm' : null),
    finish: (j, cx) => {
      const M = marked(),
        all = FELL.marked || [];
      let vol = 0;
      const sp = {};
      for (const t of M) {
        // a rough estimate as a forester makes it from height and diameter at breast height (form factor ~0,45)
        const d = 2 * FOREST.trunkR(t, 1.3);
        vol += 0.45 * (Math.PI / 4) * d * d * t.h;
        sp[t.sp] = (sp[t.sp] || 0) + 1;
      }
      const ka = S.ext.kaefer ? 'Bohrmehl an ' + S.ext.kaefer.n + ' Fichten – schnell raus damit' : 'keine Spuren';
      const data = { marked: all.length, standing: M.length, vol: +vol.toFixed(1), sp, kaefer: ka };
      STRAT.reveal('wald', 'klinge', data, j.who[0], {
        title: 'Die Klinge: ' + M.length + ' markierte Bäume',
        source: 'Waldbegang ' + names(j.who) + ', Auszeichnung des Revierförsters',
        text:
          Object.entries(sp)
            .map(([k, n]) => n + ' ' + SPN[k])
            .join(', ') +
          ', zusammen ≈ ' +
          de(vol, 1) +
          ' fm',
      });
      // known again: the knowledge is renewed (date), the beetle event's trees found
      S.known['wald:klinge'].data = data;
      return { text: M.length + ' markierte Bäume, ≈ ' + de(vol, 1) + ' fm' };
    },
  });
  // ---------------- 2 · fell a marked tree and work it up ----------------
  const winter = mo => mo >= 9 || mo <= 1; // October to February: the sap rest
  STRAT.job.define({
    id: 'faellen',
    label: 'Markierten Baum fällen und aufarbeiten',
    place: 'klinge',
    people: [2, 3],
    skill: 'holz',
    min: 2,
    cert: 'motorsaege',
    certOne: true,
    loud: true,
    saw: true,
    where: 'wald',
    heavy: 0.9,
    xp: 2,
    order: 10,
    text: 'Fallkerb, Fällschnitt mit Halteband, Keil, Warnruf – dann entasten, ablängen (4,10 m für die Bandsäge), vermessen. Zu zweit.',
    learn:
      'Ein Fichtenstamm von 25 m hat etwa 1–1,5 Festmeter. Im Winter gefällt (Saftruhe) reißt das Holz weniger und wird seltener blau. Der Gefahrenbereich ist die doppelte Baumlänge.',
    can: cx => {
      if (cx.wx.storm || cx.wx.wind > 50) return 'sturm';
      if (!STRAT.known('wald', 'klinge'))
        return {
          no: true,
          text: 'Erst nachsehen, welche Bäume markiert sind (Waldbegang).',
          why: 'Gefällt wird nur, was der Förster ausgezeichnet hat – und man muss den Baum, seine Neigung und die Fallrichtung vorher ansprechen.',
          src: 'Forstliche Praxis; DGUV Information 214-046',
        };
      if (!marked().length && !(cx.job && cx.job.d.tree != null))
        return {
          no: true,
          text: 'Kein markierter Baum steht mehr – der Förster muss neu auszeichnen.',
          why: '',
          src: '',
        };
      return null;
    },
    init: j => {
      const t = marked()[0];
      j.d.tree = t ? t.id : null;
      j.d.sp = t ? t.sp : null;
      j.d.h = t ? t.h : 0;
    },
    dur: (j, cx) => {
      const t = marked()[0];
      return ((20 + 1.6 * (t ? t.h : 22)) * 4) / (1 + Math.min(5, cx.skill));
    },
    step: (j, cx, dw, k) => {
      j.d.saw = (j.d.saw || 0) + dw;
      if (!j.d.down && k >= 0.35 && j.d.tree != null) {
        const q = Math.min(1, 0.45 + 0.11 * cx.skill);
        const r = FELL.simFell(j.d.tree, { q, who: names(j.who) });
        j.d.down = true;
        j.d.res = r;
        if (!r) j.d.fail = true;
        else
          STRAT.note(`Baum fällt! ${SPN[r.sp]} ${Math.round(r.h)} m – ${r.n} Abschnitte, ${de(r.vol, 2)} fm.`, {
            kind: 'holz',
          });
      }
    },
    finish: (j, cx) => {
      const h = (j.d.saw || j.dur) / 60,
        eur = h * (D.MACHINES.kettensaege.lph * PR.alkylat.eur + D.MACHINES.kettensaege.oil * PR.kettenoel.eur);
      STRAT.book(-eur, `Motorsäge: ${de(h * D.MACHINES.kettensaege.lph, 1)} l Sonderkraftstoff, Kettenöl`, 'holz');
      const r = j.d.res;
      if (!r) return { text: 'der Baum stand schon nicht mehr' };
      if (winter(cx.date.getUTCMonth())) STRAT.style(1, 'In der Saftruhe gefällt');
      return {
        text: `${SPN[r.sp]} ${Math.round(r.h)} m: ${r.n} Abschnitte, ${de(r.vol, 2)} fm · ${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}${winter(cx.date.getUTCMonth()) ? '' : ' (außerhalb der Saftruhe: Bläue-Gefahr)'}`,
      };
    },
  });
  // ---------------- 3 · skid with tractor and winch, the stake trailer home to the log yard ----------------
  const PAYLOAD = 5000; // kg on the tandem stake trailer (1650 kg empty, vehicles/trailer.js)
  STRAT.job.define({
    id: 'ruecken',
    label: 'Stämme rücken und ins Holzlager fahren',
    place: 'klinge',
    people: [1, 2],
    skill: 'maschinen',
    min: 2,
    loud: true,
    saw: true,
    where: 'wald',
    heavy: 0.5,
    order: 20,
    text: 'Mit Traktor und Seilwinde an den Waldweg ziehen, auf den Rungenanhänger, über den Feldweg nach Hause, im Holzlager abrollen lassen.',
    learn:
      'Frische Fichte wiegt etwa 780 kg je Festmeter – ein Anhänger mit 5 t trägt gut 6 fm. Die Seilwinde zieht den Stamm, niemand steht im Seilwinkel.',
    can: cx => {
      if (cx.wx.storm) return 'sturm';
      if (!logsForest().length && !(cx.job && cx.job.d.ids && cx.job.d.ids.length))
        return { no: true, text: 'Im Wald liegen keine Stämme.', why: '', src: '' };
      if (S.diesel < 3)
        return {
          no: true,
          text: 'Kein Diesel für den Traktor.',
          why: 'Ein Traktor mit Seilwinde braucht beim Rücken 4–5 l Diesel in der Stunde.',
          src: 'Herstellerangaben; Diesel kaufen in Schleusingen',
        };
      return null;
    },
    init: j => {
      const L = logsForest().sort((a, b) => b.vol - a.vol),
        ids = [];
      let kg = 0;
      for (const l of L) {
        const m = HOLZ.mass(l);
        if (kg + m > PAYLOAD && ids.length) continue;
        ids.push(l.id);
        kg += m;
      }
      j.d.ids = ids;
      j.d.kg = kg;
    },
    dur: (j, cx) => {
      const n = (j.d.ids || logsForest()).length || 1;
      return ((18 + 10 * n) * 3.5) / (1 + Math.min(5, cx.skill) * 0.85);
    },
    step: (j, cx, dw, k) => {
      const l = (dw / 60) * D.MACHINES.traktor.lph;
      S.diesel = Math.max(0, S.diesel - l);
      j.d.diesel = (j.d.diesel || 0) + l;
      if (!j.d.home && k >= 0.85) {
        j.d.home = true;
        toYard(j.d.ids || []);
      }
    },
    finish: j => {
      const ids = j.d.ids || [],
        L = ids.map(id => HOLZ.by[id]).filter(Boolean);
      return {
        text: `${L.length} Stämme, ${de(fm(L), 2)} fm (${Math.round(j.d.kg || 0)} kg) im Holzlager · ${de(j.d.diesel || 0, 1)} l Diesel`,
      };
    },
  });
  // the logs unloaded beside the log yard as off the trailer: side by side, lying north–south like on the mill (werk/holz.js)
  function toYard(ids) {
    const Y = HOLZ.YARD0 || { x: -1.5, y: -24.6, az: 0 },
      ux = Math.sin(Y.az || 0),
      uy = Math.cos(Y.az || 0),
      vx = Math.cos(Y.az || 0),
      vy = -Math.sin(Y.az || 0);
    let off = -1.8 + logsYard().length * 0.55;
    for (const id of ids) {
      const l = HOLZ.by[id];
      if (!l || l.st !== 'ground') continue;
      const r0 = l.d0 / 200,
        r1 = l.d1 / 200,
        rm = Math.max(r0, r1);
      off += rm;
      const cx = Y.x + vx * off,
        cy = Y.y + vy * off;
      l.p0 = [cx - (ux * l.L) / 2, cy - (uy * l.L) / 2, 0];
      l.p1 = [cx + (ux * l.L) / 2, cy + (uy * l.L) / 2, 0];
      l.p0[2] = HOLZ.support(l.p0[0], l.p0[1], l) + r0;
      l.p1[2] = HOLZ.support(l.p1[0], l.p1[1], l) + r1;
      HOLZ.restOn(l);
      l.wp0 = l.p0;
      l.wp1 = l.p1;
      off += rm + 0.06;
    }
    HOLZ.redraw();
    HOLZ.save();
  }
  // ---------------- 4 · the band sawmill: logs into boards (30 mm) or planks (52 mm) ----------------
  for (const [id, t, label] of [
    ['saegen30', 0.03, 'Stämme zu Brettern sägen (30 mm)'],
    ['saegen52', 0.052, 'Stämme zu Bohlen sägen (52 mm, für Leimholz und Bauholz)'],
  ])
    STRAT.job.define({
      id,
      label,
      place: 'holzlager',
      people: [1, 2],
      skill: 'maschinen',
      min: 2,
      loud: true,
      where: 'dorf',
      heavy: 0.6,
      order: id === 'saegen30' ? 30 : 31,
      text: 'Stamm für Stamm auf die Blockbandsäge: festklemmen, Schwarte ab, Brett für Brett bis 3 cm über die Bänke.',
      learn:
        'Sägefrisch hat Fichte im Splint 130–150 % Holzfeuchte, im Kern um 50 %. Ein Brett schwindet beim Trocknen in der Dicke um 3–4 % – daher das Übermaß.',
      can: cx => {
        if (cx.wx.rain > 0.3) return 'regen_saege';
        if (!logsYard().length && !(cx.job && cx.job.d.ids))
          return { no: true, text: 'Im Holzlager liegen keine Stämme.', why: '', src: '' };
        if (W.fuel().can < 0.5)
          return {
            no: true,
            text: 'Kein Benzin für den Motor der Bandsäge.',
            why: 'Der Benzinmotor einer kleinen Blockbandsäge braucht etwa 1,4 l in der Stunde.',
            src: 'Herstellerangaben (6,5-PS-Motor)',
          };
        return null;
      },
      init: j => {
        j.d.ids = logsYard()
          .filter(l => l.L <= 4.6)
          .map(l => l.id);
        j.d.t = t;
        j.d.n = 0;
        j.d.boards = 0;
      },
      dur: (j, cx) => {
        const L = (j.d.ids || []).map(i => HOLZ.by[i]).filter(Boolean);
        return (L.reduce((s, l) => s + 25 + 4 * l.L, 0) * 3) / (1 + Math.min(5, cx.skill) * 0.7);
      },
      step: (j, cx, dw, k) => {
        const ids = j.d.ids || [],
          want = Math.floor(k * ids.length + 1e-6);
        while (j.d.n < want) {
          const r = HOLZSAW.simSaw(ids[j.d.n], j.d.t);
          if (r) j.d.boards += r.boards;
          j.d.n++;
        }
        const l = (dw / 60) * D.MACHINES.blockband.lph;
        j.d.petrol = (j.d.petrol || 0) + W.fuelUse('can', l);
      },
      finish: j => ({
        text: `${j.d.n} Stämme → ${j.d.boards} ${j.d.t > 0.035 ? 'Bohlen' : 'Bretter'} (${Math.round(j.d.t * 1000)} mm) · ${de(j.d.petrol || 0, 1)} l Benzin`,
      }),
    });
  // ---------------- 5 · the drying stack ----------------
  STRAT.job.define({
    id: 'stapeln',
    label: 'Trockenstapel anlegen (Leisten, Dach)',
    place: 'holzlager',
    people: [1, 3],
    skill: 'holz',
    min: 1,
    heavy: 0.5,
    order: 40,
    text: 'Unterbau 45 cm, Stapelleisten alle 50 cm, 2 cm Luft zwischen den Brettern, Hirnholz versiegelt, Dach mit Gewicht.',
    learn:
      'Luftgetrocknet unter Dach: 25 mm Fichte, im Mai gestapelt, hat nach fünf Wochen etwa 20 %; im Herbst gestapelt erst im Frühjahr. Unter 20 % ist das Holz lufttrocken.',
    can: cx =>
      !boardsPile().length && !(cx.job && cx.job.d.n)
        ? { no: true, text: 'Keine frischen Bretter im Block.', why: '', src: '' }
        : null,
    init: j => {
      j.d.n = boardsPile().length;
    },
    dur: (j, cx) =>
      (8 + 4.5 * (j.d.n || boardsPile().length)) / Math.max(1, j.who.length * 0.8) / (0.7 + 0.1 * cx.skill),
    finish: () => {
      const n = HOLZDRY.simStack();
      return { text: `${n} Bretter im Trockenstapel` };
    },
  });
  // ---------------- 6 · the workshop: buy oak, make boards, deliver ----------------
  STRAT.job.define({
    id: 'leimholz',
    label: 'Leimholz Eiche bestellen (3 Platten)',
    place: 'werkstatt',
    spot: (j, id) => STRAT.pos(id).slice(0, 2),
    people: [1, 1],
    skill: 'reden',
    min: 1,
    heavy: 0,
    order: 10,
    text: '3 Leimholzplatten Eiche 40 × 400 × 1000 mm beim Holzhandel bestellen – Lieferung morgen um 9 Uhr. Eine Platte gibt zwei Bretter.',
    learn:
      'Für Stirnholzbretter nimmt man Hartholz: Eiche, Buche, Nuss – die Klinge hat nur Nadelholz (Fichte, Lärche, Kiefer). Eichenleimholz mit durchgehender Lamelle ist technisch auf 8–10 % getrocknet.',
    dur: 15,
    can: () =>
      S.eur < 3 * PR.leimholz.eur + PR.lieferung.eur
        ? { no: true, text: 'Nicht genug Geld in der Kasse.', why: '', src: '' }
        : null,
    finish: j => {
      const deal = j.who.some(id => STRAT.ability.buff(id, 'handel')) ? 0.9 : 1,
        eur = (3 * PR.leimholz.eur + PR.lieferung.eur) * deal;
      STRAT.book(-eur, '3 Leimholzplatten Eiche, Lieferung' + (deal < 1 ? ' (gut verhandelt)' : ''), 'werkstatt');
      WERK.orderPanels(3);
      return { text: 'Lieferung morgen um 9 Uhr' };
    },
  });
  STRAT.job.define({
    id: 'brett',
    label: 'Schneidebrett Eiche bauen (Stirnholz)',
    place: 'werkstatt',
    people: [1, 1],
    skill: 'holz',
    min: 2,
    loud: true,
    heavy: 0.5,
    xp: 1.5,
    watt: 450, // on average over the job: the table saw (2 kW) and the drum sander (1,5 kW) run only now and then
    order: 20,
    text: 'Ablängen, Kanteln sägen, verleimen, hobeln, in Scheiben schneiden, gewendet verleimen, schleifen bis K240, zweimal ölen, Brandzeichen.',
    learn:
      'Stirnholz schont das Messer: die Klinge gleitet zwischen die Fasern statt sie zu schneiden. Eichenstaub gilt als krebserzeugend – FFP2 beim Schleifen. Tischkreissäge (2 kW) und Trommelschleifer laufen über PV und Powerstation, sonst das Aggregat.',
    dur: (j, cx) => {
      const m = j.who.some(id => STRAT.ability.buff(id, 'meisterstueck')) ? 1.3 : 1;
      return ((300 * 3) / Math.max(1.5, cx.skill)) * m;
    },
    can: cx => {
      if (!panelHalves() && !(cx.job && cx.job.d.started))
        return {
          no: true,
          text: 'Keine Leimholzplatte Eiche im Regal – erst bestellen.',
          why: 'Klingenholz-Bretter sind aus Hartholz; die eigene Klinge gibt nur Nadelholz.',
          src: 'Holzkunde: Rohdichte und Härte (Eiche ~ 690 kg/m³, Fichte ~ 450 kg/m³)',
        };
      if (S.power.none)
        return {
          no: true,
          text: 'Kein Strom: Powerstation leer und kein Benzin im Aggregat.',
          why: 'Die Tischkreissäge zieht 2 kW – mehr als PV allein liefert.',
          src: '',
        };
      return null;
    },
    start: j => {
      j.d.started = true;
    },
    finish: (j, cx) => {
      const id = j.who[0],
        sk = STRAT.skillOf(id, 'holz') * 0.6 + STRAT.skillOf(id, 'maschinen') * 0.4,
        r = C.rng(((cx.t | 0) * 7 + id.length * 131) | 0)(),
        m = STRAT.ability.buff(id, 'meisterstueck'),
        st = C.stars(sk, cx.eff, r, m ? 1 : 0);
      if (m) S.people[id].buff.meisterstueck = 0;
      const notes = [];
      if (cx.eff < 0.7) notes.push('müde gearbeitet: Fugen nicht ganz sauber');
      const wp = WERK.simBoard({ stars: st, who: D.PEOPLE[id].name, notes, oak: true });
      if (!wp) return { text: 'kein Leimholz mehr da' };
      return { text: `${'★'.repeat(st)}${'☆'.repeat(5 - st)} von ${D.PEOPLE[id].name}${m ? ' (Meisterstück)' : ''}` };
    },
  });
  STRAT.job.define({
    id: 'liefern',
    label: 'Bestellung ausliefern',
    place: 'werkstatt',
    people: [1, 1],
    skill: 'reden',
    min: 1,
    heavy: 0.1,
    order: 30,
    text: 'Die fertigen Bretter verpacken und mit dem Auto zur Kundin bringen.',
    learn: 'Ein Auto braucht auf der Landstraße 6–7 l auf 100 km; nach Suhl und zurück sind es gut 40 km.',
    dur: 80,
    can: () => {
      const o = S.orders.find(x => x.st === 'offen' || x.st === 'verspätet');
      if (!o) return { no: true, text: 'Gerade ist keine Bestellung offen.', why: '', src: '' };
      const ok = shelf(o.minStars || 0).length;
      if (ok < o.n - (o.got || 0))
        return {
          no: true,
          text: `${ok} von ${o.n - (o.got || 0)} Brettern mit mindestens ${o.minStars} Sternen sind fertig.`,
          why: 'Die Kundin will die Qualität, die vereinbart ist – ein Brett unter den Sternen geht zurück.',
          src: '',
        };
      return null;
    },
    finish: (j, cx) => {
      const o = S.orders.find(x => x.st === 'offen' || x.st === 'verspätet');
      if (!o) return { text: 'keine Bestellung mehr offen' };
      const need = o.n - (o.got || 0),
        boards = shelf(o.minStars || 0)
          .sort((a, b) => (a.stars || 0) - (b.stars || 0))
          .slice(0, need);
      const n = WERK.handOut(boards.map(w => w.id));
      o.got = (o.got || 0) + n;
      const lv = STRAT.level('falko'),
        bonus = Math.min(0.2, 0.02 * lv),
        deal = j.who.some(id => STRAT.ability.buff(id, 'handel')) ? 1.1 : 1;
      const pay = n * (o.price || PR.brett.eur) * (1 + bonus) * deal;
      STRAT.book(pay, `${n} × ${o.title.replace(/^\d+ /, '')}`, 'verkauf');
      STRAT.book(-40 * 0.065 * PR.benzin.eur, 'Fahrt zur Kundin (40 km)', 'auto');
      const late = cx.t > o.due;
      if (o.got >= o.n) {
        o.st = 'geliefert';
        o.t1 = Math.round(cx.t);
        if (!late) STRAT.style(2, 'Pünktlich geliefert: ' + o.title);
        STRAT.emit('bestellung', { id: o.id, state: 'geliefert', late });
      }
      return { text: `${n} Bretter geliefert, ${C.eur(pay)}${late ? ' (zu spät)' : ' – pünktlich'}` };
    },
  });
  // ---------------- 7 · the chainsaw course (two days, in the region) ----------------
  STRAT.job.define({
    id: 'kurs_ms',
    label: 'Motorsägen-Lehrgang (Modul A und B)',
    place: 'schleusingen',
    people: [1, 2],
    heavy: 0.4,
    xp: 1.2,
    order: 10,
    text: 'Zwei Tage bei einem Lehrgangsanbieter in der Region: Technik, Wartung, Schnitttechnik, Fällen unter Anleitung. 290 € je Person.',
    learn:
      D.KNOW.motorsaege.text +
      ' Ohne den Lehrgang fällt man nicht – so verlangen es die Unfallversicherung (SVLFG) und die Forstbetriebe.',
    can: cx => {
      const have = cx.who.filter(id => S.people[id].certs.includes('motorsaege'));
      if (have.length) return { no: true, text: `${names(have)} hat den Lehrgang schon.`, why: '', src: '' };
      if (S.eur < cx.who.length * PR.kurs_ms.eur)
        return { no: true, text: 'Nicht genug Geld in der Kasse.', why: '', src: '' };
      return null;
    },
    dur: 2 * 8 * 60,
    start: j => {
      STRAT.book(-j.who.length * PR.kurs_ms.eur, 'Motorsägen-Lehrgang · ' + names(j.who), 'wissen');
    },
    finish: j => {
      for (const id of j.who) if (!S.people[id].certs.includes('motorsaege')) S.people[id].certs.push('motorsaege');
      STRAT.reveal('wissen', 'motorsaege', { who: j.who }, j.who[0], {
        title: 'Motorsägen-Lehrgang bestanden',
        source: D.KNOW.motorsaege.src,
        text: 'jetzt darf ' + names(j.who) + ' fällen',
      });
      return { text: names(j.who) + ' darf jetzt fällen' };
    },
  });
  // ---------------- the first order (brief: „5 Schneidebretter Eiche“ with a date and minimum stars) ----------------
  STRAT.onLoad.push(() => {
    if (!S.orders.some(o => o.key === D.ORDER0.id))
      STRAT.order.add({
        key: D.ORDER0.id,
        title: D.ORDER0.title,
        who: D.ORDER0.who,
        n: D.ORDER0.n,
        minStars: D.ORDER0.minStars,
        days: D.ORDER0.days,
        price: PR.brett.eur,
        text: D.ORDER0.text,
      });
  });
  void BUILD;
  void CLOCK;
  void STJOBS;
  return { marked, logsForest, logsYard, boardsPile, boardsStack, panels, panelHalves, shelf, toYard, PAYLOAD };
})();
window.STHOLZ = STHOLZ;
