// ===================== feat/strategie: the wood chain from above (STHOLZ) – from the forester's mark to the cutting board =====================
// The real chain (plan section 4): the forester marks → look at the forest (what one knows comes from someone who went there) → fell in
// winter, in the sap rest (course, two people, forest gear, daylight, no storm) → delimb, buck, measure → skid with the tractor and the
// winch, the stake trailer, home to the log yard → the band sawmill (petrol engine) → the drying stack (months, the moisture model of
// werk/holz_dry.js) → the workshop. Decided (brief, Falko 23:14): the family forest gives spruce, larch and pine – building timber for the
// pavilion, boards, firewood; Klingenholz boards are hardwood: oak glued panels bought (Euro) until a hardwood tree is there. Every job
// changes the world through the systems of the first-person game (FELL.simFell, HOLZ, HOLZSAW.simSaw, HOLZDRY.simStack, WERK.simBoard)
// – a tree felled from above is gone in the forest, its logs lie where it fell, the boards lie in the yard, the board on the shelf.
import { KERN } from '../core/kern.js';
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
  const ownPanels = () => panels(false).filter(w => w.sp); // Leimholz of own wood (larch, spruce from the Klinge)
  // finished boards on the shelf with at least min stars: of oak (sp null – bought panels) or of own wood of one species ('larch')
  const shelf = (min = 0, sp = null) =>
    ((WERK.SHELF && WERK.SHELF.items) || []).filter(
      w => w.done && w.where === 'shelf' && (w.stars || 0) >= min && (sp ? w.sp === sp : !w.sp)
    );
  // days until the stack is air-dry (≤ 20 %): the drying model's forecast, worked out once a game day
  let dryK = '',
    dryD = 0;
  const dryIn = ms => {
    const k = Math.floor(CLOCK.t / 1440) + ':' + ms.n;
    if (k !== dryK) {
      dryK = k;
      dryD = HOLZDRY.forecast ? HOLZDRY.forecast(20) : 0;
    }
    return dryD;
  };
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
        const d = ms.avg > 20 ? dryIn(ms) : 0;
        out.push([
          'Holzfeuchte im Stapel',
          de(ms.avg, 0) +
            ' %' +
            (ms.avg > 20 ? (d > 0 ? ' – lufttrocken in ≈ ' + d + ' Tagen' : '') : ' – lufttrocken'),
        ]);
      }
      out.push(['Schwarten zum Aufarbeiten', String(slabs())]);
      const t = S.t ?? CLOCK.t;
      for (const l of FB().lots.slice(-3))
        out.push([
          'Brennholz aufgesetzt',
          de(l.rm, 1) + ' rm · ' + (lotDry(l, t) ? 'trocken' : 'trocken ab ' + W.day(l.t0 + DRY_DAYS * 1440).label),
        ]);
      return out;
    },
    // a long wait made short: until the stack is air-dry (the forecast of the drying model)
    info: () => {
      const ms = HOLZDRY.stackMC ? HOLZDRY.stackMC() : null,
        d = ms && ms.avg > 20 ? dryIn(ms) : 0;
      return d > 0
        ? `<p><button type="button" class="stb" data-skip="${d * 1440}">⏩ bis lufttrocken (≈ ${d} Tage)</button></p>`
        : '';
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
      ].concat(
        (() => {
          const k = HOLZDRY.kilnMC ? HOLZDRY.kilnMC() : null;
          return k
            ? [[k.shed ? 'Bretter unter dem Pultdach' : 'Bretter im Trockenschrank', k.n + ' · ' + de(k.mc, 1) + ' %']]
            : [];
        })(),
        shelf(0, 'larch').length ? [['Schneidebretter Lärche im Regal', String(shelf(0, 'larch').length)]] : []
      );
    },
    // drying on takes weeks: a week in time-lapse while boards are in the cabinet (or under the roof) and not yet dry enough
    info: () => {
      const k = HOLZDRY.kilnMC ? HOLZDRY.kilnMC() : null;
      return k && k.mc > HOLZDRY.kilnTarget()
        ? `<p><button type="button" class="stb" data-skip="${7 * 1440}">⏩ 1 Woche nachtrocknen</button></p>`
        : '';
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
    pose: 'saw',
    label: 'Markierten Baum fällen und aufarbeiten',
    place: 'klinge',
    people: [2, 3],
    skill: 'holz',
    min: 2,
    cert: 'motorsaege',
    certOne: true,
    psa: 2, // the one at the saw and the one beside him in the danger zone
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
    pose: 'carry',
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
    // the run: winch and load at the forest track (to 55 % of the work), the field track home with the load (to 85 %), unload at the yard –
    // the driver's symbol (and the tractor with its trailer on the map) goes along the route while it happens
    move: true,
    spot: j => rueckSpot(j),
    ride: j => rueckPhase(j) === 1,
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
  // where the skidding run is: 0 at the logs in the forest (winch, load), 1 on the field track, 2 at the yard (unload)
  const rueckPhase = j => {
    const k = j.done / Math.max(1, j.dur);
    return k < 0.55 ? 0 : k < 0.85 ? 1 : 2;
  };
  const RR = new Map(); // the route of a run (job id → { pts, L })
  function rueckSpot(j) {
    const ph = rueckPhase(j),
      a = STRAT.place.pos('klinge'),
      b = STRAT.place.pos('holzlager');
    if (!a || !b) return null;
    if (ph === 2) return [b[0] + 3, b[1] - 2];
    if (ph === 0) {
      // beside the logs of this load (the forest track below them), else the Klinge
      const L = (j.d.ids || []).map(id => HOLZ.by[id]).filter(l => l && l.st === 'ground' && l.p0 && l.p1);
      if (!L.length) return a;
      const x = L.reduce((s, l) => s + (l.p0[0] + l.p1[0]) / 2, 0) / L.length,
        y = L.reduce((s, l) => s + (l.p0[1] + l.p1[1]) / 2, 0) / L.length;
      return [x + 2.5, y + 2.5];
    }
    let R = RR.get(j.id);
    if (!R) {
      const pts = W.path(a, b);
      R = { pts, L: C.pathLen(pts) };
      RR.set(j.id, R);
      if (RR.size > 8) RR.delete(RR.keys().next().value);
    }
    const k = (j.done / Math.max(1, j.dur) - 0.55) / 0.3,
      q = C.pathAt(R.pts, Math.max(0, Math.min(1, k)) * R.L);
    return [q[0], q[1], q[2]];
  }
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
      pose: 'saw',
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
    pose: 'place',
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
    pose: 'bench',
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
      const os = openOrders();
      if (!os.length) return { no: true, text: 'Gerade ist keine Bestellung offen.', why: '', src: '' };
      if (!os.some(ready)) {
        const o = os[0],
          ok = shelf(o.minStars || 0, o.wood || null).length;
        return {
          no: true,
          text: `${o.title}: ${ok} von ${o.n - (o.got || 0)} Brettern mit mindestens ${o.minStars} Sternen sind fertig.`,
          why: 'Die Kundin will die Qualität, die vereinbart ist – ein Brett unter den Sternen geht zurück.',
          src: '',
        };
      }
      return null;
    },
    finish: (j, cx) => {
      const o = openOrders().find(ready) || openOrders()[0];
      if (!o) return { text: 'keine Bestellung mehr offen' };
      const need = o.n - (o.got || 0),
        boards = shelf(o.minStars || 0, o.wood || null)
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
  // ---------------- 6 · a forest gear set of one's own (the Forstkiste at the tractor holds one) ----------------
  STRAT.job.define({
    id: 'psa_kaufen',
    label: 'Forst-Schutzausrüstung kaufen',
    place: 'schleusingen',
    people: [1, 2],
    heavy: 0.1,
    order: 12,
    text: `Im Agrar- und Forstfachhandel anprobieren und kaufen: Helm mit Visier und Gehörschutz, Schnittschutzhose, Schnittschutzstiefel, Handschuhe – ${PR.psa_forst.eur} € je Person.`,
    learn:
      'Schnittschutzhosen gibt es in Klassen nach der Kettengeschwindigkeit (Klasse 1 bis 20 m/s reicht für die meisten Sägen). Ist die Einlage einmal angeschnitten, wird die Hose ersetzt – die Fasern sind herausgezogen.',
    can: cx => {
      const have = cx.who.filter(id => STRAT.gearOf(id).includes('forst'));
      if (have.length) return { no: true, text: `${names(have)} hat schon eine eigene.`, why: '', src: '' };
      if (S.eur < cx.who.length * PR.psa_forst.eur)
        return { no: true, text: 'Nicht genug Geld in der Kasse.', why: '', src: '' };
      return null;
    },
    dur: 75,
    finish: j => {
      for (const id of j.who)
        if (!STRAT.gearOf(id).includes('forst')) S.people[id].gear = STRAT.gearOf(id).concat('forst');
      STRAT.book(-j.who.length * PR.psa_forst.eur, 'Forst-Schutzausrüstung · ' + names(j.who), 'ausbau');
      return { text: names(j.who) + ' hat jetzt eine eigene Forst-Schutzausrüstung' };
    },
  });
  // ---------------- 7 · firewood: the slabs of the band sawmill cut to 33 cm, split, stacked under a roof; sold fresh or after a year ----
  const SLAB_RM = 0.04, // a slab of a 4 m log, split and stacked (rm = 1 m³ stacked with air, ≈ 0,7 fm)
    DRY_DAYS = 365; // spruce, 33 cm split, under a roof: one year, one summer, to below 20 % (1. BImSchV: below 25 %)
  // used: slabs worked up; lots: [{ rm, t0 }] stacked (checked – it comes from a saved state)
  const FB = () => {
    const b = S.ext.brennholz;
    if (b && typeof b === 'object' && Number.isFinite(b.used) && Array.isArray(b.lots)) return b;
    return (S.ext.brennholz = {
      used: b && Number.isFinite(b.used) ? b.used : 0,
      lots: b && Array.isArray(b.lots) ? b.lots.filter(l => l && Number.isFinite(l.rm) && Number.isFinite(l.t0)) : [],
    });
  };
  const slabs = () => Math.max(0, (HOLZSAW.fire || 0) - FB().used);
  const lotDry = (l, t) => t - l.t0 >= DRY_DAYS * 1440;
  STRAT.job.define({
    id: 'brennholz',
    pose: 'chop',
    label: 'Brennholz machen (Schwarten sägen, spalten, aufsetzen)',
    place: 'holzlager',
    people: [1, 2],
    skill: 'holz',
    min: 1,
    psa: 1,
    loud: true,
    heavy: 0.7,
    order: 40,
    text: 'Die Schwarten der Blockbandsäge am Sägebock auf 33 cm sägen, mit der Axt spalten, unter Dach luftig aufsetzen.',
    learn:
      'Ein Raummeter (rm) ist ein Kubikmeter geschichtetes Holz mit Luft, etwa 0,7 Festmeter. Fichte braucht unter Dach ein Jahr, bis sie unter 20 % Feuchte hat – erst trocken darf Holz in den Ofen (1. BImSchV: unter 25 %).',
    can: cx => {
      if (slabs() < 3 && !(cx.job && cx.job.d.n))
        return {
          no: true,
          text: 'Keine Schwarten zum Aufarbeiten – erst Stämme sägen.',
          why: 'Brennholz entsteht hier aus dem, was beim Sägen abfällt: den Schwarten mit der Rinde.',
          src: '',
        };
      return null;
    },
    init: j => {
      j.d.n = Math.min(120, slabs());
      j.d.rm = +(j.d.n * SLAB_RM).toFixed(2);
    },
    // per person 0,45–0,85 rm an hour by skill (slabs need little splitting); two work together at 1,8 times one
    dur: (j, cx) => (j.d.rm * 60) / ((0.35 + 0.1 * Math.min(5, cx.skill)) * (j.who.length > 1 ? 1.8 : 1)),
    finish: (j, cx) => {
      FB().used += j.d.n;
      FB().lots.push({ rm: j.d.rm, t0: Math.round(cx.t) });
      S.brennholz += j.d.rm;
      const h = j.dur / 60 / 3; // a third of the time at the saw
      STRAT.book(
        -h * (D.MACHINES.kettensaege.lph * PR.alkylat.eur + D.MACHINES.kettensaege.oil * PR.kettenoel.eur),
        'Motorsäge: Sonderkraftstoff, Kettenöl (Brennholz)',
        'holz'
      );
      return {
        text: `${de(j.d.rm, 1)} rm Brennholz aus ${j.d.n} Schwarten aufgesetzt – trocken ab ${W.day(cx.t + DRY_DAYS * 1440).label} ${W.dateOf(cx.t + DRY_DAYS * 1440).getUTCFullYear()}`,
      };
    },
  });
  STRAT.job.define({
    id: 'brennholz_verkaufen',
    label: 'Brennholz an Ronald verkaufen',
    place: 'ronald',
    people: [1, 2],
    skill: 'reden',
    min: 1,
    heavy: 0.4,
    order: 30,
    text: 'Bis zu 3 rm mit der Schubkarre nach nebenan fahren und bei Ronald aufsetzen; trockenes zuerst.',
    learn: `Trocken und ofenfertig bringt ein Raummeter Fichte gut ${PR.brennholz_fi.eur} € (TFZ), frisch nur rund ${PR.brennholz_frisch.eur} € – wer ein Jahr warten kann, verdient ein Drittel mehr.`,
    can: cx =>
      S.brennholz < 0.2 && !(cx.job && cx.job.d && cx.job.d.fresh + cx.job.d.dry > 0)
        ? {
            no: true,
            text: 'Zu wenig Brennholz aufgesetzt – unter 0,2 rm (zwei, drei Schubkarren) lohnt kein Verkauf.',
            why: 'Erst Brennholz machen (Holzlager): die Schwarten der Bandsäge.',
            src: '',
          }
        : null,
    init: (j, cx) => {
      // dry lots first, then the freshest last
      const lots = FB()
        .lots.slice()
        .sort((a, b) => a.t0 - b.t0);
      let left = Math.min(3, S.brennholz),
        dry = 0,
        fresh = 0;
      for (const l of lots) {
        if (left <= 0) break;
        const k = Math.min(l.rm, left);
        if (lotDry(l, cx.t)) dry += k;
        else fresh += k;
        left -= k;
      }
      j.d.dry = +dry.toFixed(2);
      j.d.fresh = +fresh.toFixed(2);
    },
    dur: j => (j.d.dry + j.d.fresh) * 30, // a wheelbarrow holds about 0,1 rm: three minutes a load, there and back, stacking
    finish: j => {
      let take = j.d.dry + j.d.fresh;
      const L = FB().lots.sort((a, b) => a.t0 - b.t0);
      while (take > 1e-6 && L.length) {
        const k = Math.min(L[0].rm, take);
        L[0].rm = +(L[0].rm - k).toFixed(3);
        take -= k;
        if (L[0].rm <= 1e-3) L.shift();
      }
      const rm = j.d.dry + j.d.fresh;
      S.brennholz = Math.max(0, S.brennholz - rm);
      const deal = j.who.some(id => STRAT.ability.buff(id, 'handel')) ? 1.08 : 1,
        eur = (j.d.dry * PR.brennholz_fi.eur + j.d.fresh * PR.brennholz_frisch.eur) * deal;
      STRAT.book(
        eur,
        `Brennholz an Ronald: ${de(rm, 1)} rm${j.d.dry ? ` (${de(j.d.dry, 1)} trocken)` : ' frisch'}`,
        'holz'
      );
      return { text: `${de(rm, 1)} rm Brennholz bei Ronald aufgesetzt – ${Math.round(eur)} €` };
    },
  });
  const openOrders = () => S.orders.filter(x => x.st === 'offen' || x.st === 'verspätet');
  const ready = o => shelf(o.minStars || 0, o.wood || null).length >= o.n - (o.got || 0);
  // ---------------- 8 · own wood for the workshop: the air-dry planks dried on (the cabinet in the hall; today under the lean-to), glued ----
  const SPD = { larch: 'Lärche', spruce: 'Fichte', pine: 'Kiefer' };
  STRAT.job.define({
    id: 'nachtrocknen',
    pose: 'carry',
    label: 'Lufttrockene Bohlen ablängen und nachtrocknen',
    place: 'werkstatt',
    people: [1, 2],
    heavy: 0.4,
    order: 45,
    text: 'Die lufttrockenen Bohlen aus dem Stapel auf 1 m ablängen und auf Leisten nachtrocknen – im Trockenschrank der Halle (Ziel 9 %) oder, solange es die Halle nicht gibt, unter dem Pultdach (im Sommer 11–12 %).',
    learn:
      'Möbel und Schneidebretter brauchen 8–12 % Holzfeuchte – so viel, wie Holz in einer geheizten Wohnung annimmt. Draußen unter Dach kommt es bei uns nur auf 13 % im Sommer und 21 % im Winter.',
    can: () => {
      const k = HOLZDRY.kilnMC && HOLZDRY.kilnMC();
      if (k) return { no: true, text: `Es trocknen schon ${k.n} Bretter nach (${de(k.mc, 1)} %).`, why: '', src: '' };
      if (HOLZDRY.advance) HOLZDRY.advance(); // the boards brought up to the clock (lazily, in days)
      const ms = HOLZDRY.stackMC && HOLZDRY.stackMC();
      if (!ms || !ms.n) return { no: true, text: 'Im Stapel liegen keine Bretter.', why: '', src: '' };
      if (ms.avg > 21)
        return {
          no: true,
          text: `Erst lufttrocken: im Stapel noch ${de(ms.avg, 0)} % im Mittel.`,
          why: 'Über etwa 20 % reißen Bretter beim Nachtrocknen – das Feuchtegefälle zwischen Kern und Oberfläche ist zu groß. Im Stapel trocknen sie über den Sommer; dicke Bohlen brauchen deutlich länger als dünne Bretter.',
          src: 'Holzfachkunde; Trocknungsmodell werk/holz_dry.js nach dem Klima von Meiningen (DWD 1991–2020)',
        };
      return null;
    },
    dur: 90,
    finish: () => {
      const r = HOLZDRY.simKiln();
      if (!r || r.no) return { text: (r && r.text) || 'Nichts eingelagert' };
      return {
        text: `${r.n} Bretter (${de(r.mc, 0)} %) ${r.shed ? 'unter dem Pultdach' : 'im Trockenschrank'} – ${r.days > 0 ? `${r.shed ? 12 : 9} % in etwa ${r.days} Tagen` : 'unter 12 % erst im Sommer'}`,
      };
    },
  });
  STRAT.job.define({
    id: 'leimholz_eigen',
    pose: 'bench',
    label: 'Leimholz aus eigenen Bohlen (besäumen, schleifen, verleimen)',
    place: 'werkstatt',
    people: [1, 2],
    skill: 'holz',
    min: 2,
    loud: true,
    watt: 1700, // the table saw and the drum sander in turn
    heavy: 0.5,
    order: 46,
    text: 'Die nachgetrockneten Bohlen an der Tischkreissäge besäumen, am Trommelschleifer plan schleifen und mit Zwingen zu Platten 40 × 400 × 1000 mm verleimen – das Holz der Klinge für Stirnholzbretter.',
    learn:
      'Aus Bohlen ab 35 mm werden Leimholzplatten; dünnere Bretter bleiben auf Vorrat. Verleimt man zu feuchtes Holz, schwindet es danach in der Wohnung weiter – die Fugen reißen.',
    can: () => {
      const k = HOLZDRY.kilnMC && HOLZDRY.kilnMC();
      if (!k)
        return {
          no: true,
          text: 'Nichts nachgetrocknet – erst die lufttrockenen Bohlen nachtrocknen.',
          why: '',
          src: '',
        };
      const tg = HOLZDRY.kilnTarget();
      if (k.mc > tg)
        return {
          no: true,
          text: `Noch ${de(k.mc, 1)} % – zum Verleimen höchstens ${de(tg, 0)} %.`,
          why: 'Möbel- und Schneidebrettholz hat 8–12 % Holzfeuchte; feuchter verleimt reißen die Fugen, wenn es in der Wohnung nachtrocknet.',
          src: 'Holzfachkunde (Holzfeuchte für Möbel und Innenausbau)',
        };
      return null;
    },
    dur: 4 * 60,
    finish: () => {
      const n0 = ownPanels().length,
        k = HOLZDRY.kilnMC(),
        n = HOLZDRY.simShop(),
        got = ownPanels().length - n0,
        sp = got ? SPD[ownPanels().slice(-1)[0].sp] || '' : '';
      return {
        text: got
          ? `${got} Leimholzplatte${got > 1 ? 'n' : ''} ${sp} aus eigenem Holz (${de(k ? k.mc : 0, 1)} %) liegen im Werkstattregal`
          : `${n} Bretter auf Vorrat in der Werkstatt – für Leimholz braucht es Bohlen ab 35 mm`,
      };
    },
  });
  // ---------------- 9 · boards of own larch – and the order for them once there is Leimholz of it ----------------
  const ownLarch = () => ownPanels().filter(w => w.sp === 'larch' && w.L >= 480);
  STRAT.job.define({
    id: 'brett_eigen',
    pose: 'bench',
    label: 'Schneidebrett Lärche aus der Klinge bauen',
    place: 'werkstatt',
    people: [1, 1],
    skill: 'holz',
    min: 2,
    loud: true,
    heavy: 0.5,
    xp: 1.5,
    watt: 450,
    order: 21,
    text: 'Wie bei Eiche, aus dem eigenen Leimholz: Lärche aus der Klinge – rötliches Kernholz, kräftige Jahrringe, etwas Harz.',
    learn:
      'Lärche ist das härteste heimische Nadelholz (Rohdichte um 590 kg/m³) und taugt für Schneidebretter; Fichte (um 450 kg/m³) ist zu weich – das Messer schneidet Kerben, in denen sich Keime halten.',
    show: () => ownPanels().length > 0,
    dur: (j, cx) => {
      const m = j.who.some(id => STRAT.ability.buff(id, 'meisterstueck')) ? 1.3 : 1;
      return ((300 * 3) / Math.max(1.5, cx.skill)) * m;
    },
    can: cx => {
      if (!ownLarch().length && !(cx.job && cx.job.d.started))
        return ownPanels().length
          ? {
              no: true,
              text: 'Das eigene Leimholz ist Fichte – zu weich für ein Schneidebrett.',
              why: 'Fichte hat eine Rohdichte um 450 kg/m³: das Messer schneidet Kerben, in denen sich Keime halten. Fichte ist Bau- und Regalholz.',
              src: 'Holzkunde: Rohdichten bei 12–15 % Holzfeuchte (Fichte ~450, Lärche ~590, Eiche ~690 kg/m³)',
            }
          : {
              no: true,
              text: 'Kein Leimholz aus eigenem Holz im Regal – erst Bohlen nachtrocknen und verleimen.',
              why: '',
              src: '',
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
      const notes = ['Lärche aus der Klinge'];
      if (cx.eff < 0.7) notes.push('müde gearbeitet: Fugen nicht ganz sauber');
      const wp = WERK.simBoard({ stars: st, who: D.PEOPLE[id].name, notes, sp: 'larch' });
      if (!wp) return { text: 'kein Leimholz Lärche mehr da' };
      return {
        text: `${'★'.repeat(st)}${'☆'.repeat(5 - st)} Lärche von ${D.PEOPLE[id].name}${m ? ' (Meisterstück)' : ''}`,
      };
    },
  });
  // the first Leimholz of own larch brings the order for it (the story of the workshop: boards from the wood of the Klinge)
  KERN.on('strategie:auftrag', d => {
    if (!d || d.state !== 'fertig' || d.def !== 'leimholz_eigen') return;
    if (!ownLarch().length || S.orders.some(o => o.key === 'laerche3')) return;
    STRAT.order.add({
      key: 'laerche3',
      title: '3 Schneidebretter Lärche aus der Klinge',
      who: 'ein Hofladen in Schleusingen',
      n: 3,
      minStars: 3,
      days: 28,
      wood: 'larch',
      price: PR.brett_laerche.eur,
      text: 'Drei Stirnholzbretter aus Lärche vom eigenen Wald – mit der Geschichte, woher das Holz kommt.',
    });
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
  return {
    marked,
    logsForest,
    logsYard,
    boardsPile,
    boardsStack,
    panels,
    panelHalves,
    ownPanels,
    shelf,
    toYard,
    PAYLOAD,
  };
})();
window.STHOLZ = STHOLZ;
