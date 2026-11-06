// ===================== feat/strategie: what happens – events, risks, favours (STEREIG) =====================
// Falko's choice (23:14): events from the start – a storm with windthrow in the Klinge, the bark beetle in the spruces (out within weeks),
// a machine breakdown, a big order with a short date; and real safety: tired or without protective gear one gets hurt – lost days, no blood.
// Each is drawn once a game day (the same day always draws the same), and none is known before someone sees it: the storm's windthrow and
// the beetle's bore dust are found by whoever goes into the Klinge (exploration). Windthrow is dangerous work for professionals: a
// forestry contractor is hired (Euro per cubic metre). The animals of the region come from feat/tiere (window.TIERE) when it is there.
import { KERN } from '../core/kern.js';
import { FOREST } from '../world/forest.js';
import { FELL } from '../world/fell.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
import { STHOLZ } from './st_holz.js';
export const STEREIG = (() => {
  const D = STDATA,
    C = STCORE,
    S = STRAT.S,
    W = STRAT.W;
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const ext = k => S.ext[k] || null;
  const names = who => who.map(id => D.PEOPLE[id].name).join(' und ');
  // spruces of the family forest near the track (where a storm throws and the beetle bores first: shallow roots, the edge)
  function spruces(n, seed, skip = []) {
    const list = (FOREST.list || []).filter(
      t =>
        t.core && !t.gone && t.sp === 'spruce' && t.h >= 14 && !(FELL.marked || []).includes(t) && !skip.includes(t.id)
    );
    const r = C.rng(seed | 0),
      out = [];
    for (let k = 0; k < 200 && out.length < n && list.length; k++) {
      const t = list[Math.floor(r() * list.length)];
      if (!out.includes(t.id)) out.push(t.id);
    }
    return out;
  }
  // ---------------- the storm: windthrow in the Klinge ----------------
  STRAT.event.define({
    id: 'sturm',
    label: 'Sturm über dem Thüringer Wald',
    why: 'Fichten wurzeln flach; auf nassem Boden wirft sie ein Sturm samt Wurzelteller. Liegendes Sturmholz muss raus, bevor der Borkenkäfer darin brütet.',
    src: 'ThüringenForst; Forstliche Praxis',
    chance: cx => {
      if (ext('sturm') && !ext('sturm').done) return 0;
      if (cx.wx.storm) return 0.5;
      const mo = cx.date.getUTCMonth();
      return mo >= 10 || mo <= 2 ? 0.012 : 0.003;
    },
    run: cx => {
      const n = 1 + Math.floor(C.rng((cx.t | 0) * 3)() * 3),
        ids = spruces(n, cx.t * 7);
      if (!ids.length) return false;
      S.ext.sturm = { t: Math.round(cx.t), ids, known: false, done: false };
      return {
        text: 'Nachts Sturm über dem Thüringer Wald. Ob in der Klinge etwas passiert ist, weiß erst, wer hinschaut.',
      };
    },
  });
  // ---------------- the bark beetle (the engraver, Ips typographus) in the spruces ----------------
  STRAT.event.define({
    id: 'kaefer',
    label: 'Borkenkäfer in der Klinge',
    why: 'Der Buchdrucker bohrt sich in geschwächte Fichten; nach 6–10 Wochen fliegt die nächste Generation aus. Befallene Bäume fällen und aus dem Wald bringen, bevor sie ausfliegen.',
    src: 'ThüringenForst, Waldschutz; Bayerische Landesanstalt für Wald und Forstwirtschaft (LWF)',
    chance: cx => {
      if (ext('kaefer') && !ext('kaefer').done) return 0;
      const mo = cx.date.getUTCMonth();
      if (mo < 3 || mo > 8) return 0;
      let p = 0.004;
      if (ext('sturm') && !ext('sturm').done) p *= 4; // breeding material lies about
      if (cx.wx.cloud < 0.35) p *= 1.6; // warm and dry
      // feat/tiere: when its model of the beetle runs (TIERE.kaefer.list – the spruces it attacks, day by day), the core draws none of
      // its own; the forest walk reports theirs, and a tree felled from above (KERN 'fell') is out of the forest for it
      const T = window.TIERE;
      if (T && T.kaefer && typeof T.kaefer.list === 'function') return 0;
      if (T && typeof T.kaefer === 'function')
        try {
          return T.kaefer(cx);
        } catch (e) {}
      return p;
    },
    run: cx => {
      const st = ext('sturm'),
        n = 2 + Math.floor(C.rng((cx.t | 0) * 5)() * 4),
        ids = spruces(n, cx.t * 11, st ? st.ids : []);
      if (!ids.length) return false;
      S.ext.kaefer = {
        t: Math.round(cx.t),
        ids,
        n: ids.length,
        known: false,
        done: false,
        due: Math.round(cx.t + 42 * 1440),
      };
      return {
        text: 'Warme Tage – eine gute Zeit für den Borkenkäfer. Jemand sollte in der Klinge nach Bohrmehl sehen.',
      };
    },
  });
  // the beetle not removed in time: the next generation flies out and takes more spruces (and the neighbours' forest)
  STRAT.event.define({
    id: 'kaefer2',
    label: 'Die Käfer fliegen aus',
    chance: cx => {
      const k = ext('kaefer');
      return k && !k.done && cx.t > k.due ? 1 : 0;
    },
    run: cx => {
      const k = ext('kaefer'),
        more = spruces(k.ids.length, cx.t * 13, k.ids);
      k.ids = k.ids.concat(more);
      k.n = k.ids.length;
      k.due = Math.round(cx.t + 42 * 1440);
      STRAT.style(-6, 'Käferbäume zu spät aus dem Wald');
      return {
        text: `Die Käfer sind ausgeflogen: jetzt ${k.n} befallene Fichten in der Klinge – auch der Nachbarwald ist in Gefahr.`,
      };
    },
  });
  // what one finds when one looks (the Waldbegang of strategie/st_holz.js calls it through the event strategie:auftrag)
  KERN.on('strategie:auftrag', d => {
    if (!d || d.state !== 'fertig' || d.def !== 'waldbegang') return;
    const st = ext('sturm'),
      k = ext('kaefer');
    if (st && !st.done && !st.known) {
      st.known = true;
      STRAT.reveal('wald', 'sturmholz', { n: st.ids.length }, d.who && d.who[0], {
        title: `Sturmholz: ${st.ids.length} Fichte${st.ids.length > 1 ? 'n' : ''} geworfen`,
        source: 'Waldbegang nach dem Sturm',
        text: 'Bäume unter Spannung – Profiarbeit: einen Forstunternehmer beauftragen',
      });
    }
    if (k && !k.done && !k.known) {
      k.known = true;
      STRAT.reveal('wald', 'kaefer', { n: k.ids.length }, d.who && d.who[0], {
        title: `Borkenkäfer: Bohrmehl an ${k.ids.length} Fichten`,
        source: 'Waldbegang: braunes Bohrmehl am Stammfuß, Einbohrlöcher',
        text: 'innerhalb von sechs Wochen fällen und aus dem Wald bringen',
      });
    }
  });
  // ---------------- the forestry contractor: windthrow and beetle trees out of the forest (Euro per cubic metre) ----------------
  const RATE = 32; // € per fm felled, processed and at the track (assumption: contractor rates 2026 for small private forests)
  STRAT.job.define({
    id: 'unternehmer',
    label: 'Forstunternehmer beauftragen (Sturm- und Käferholz)',
    place: 'klinge',
    people: [1, 1],
    skill: 'reden',
    min: 2,
    heavy: 0.1,
    order: 3,
    spot: (j, id) => STRAT.pos(id).slice(0, 2),
    text: 'Ein Forstunternehmer fällt die geworfenen und befallenen Bäume und legt die Stämme an den Waldweg (Termin in ein paar Tagen).',
    learn:
      'Sturmholz steht unter Spannung – beim Abschneiden schlagen Stämme und Wurzelteller unberechenbar. Das ist die gefährlichste Waldarbeit; Unternehmer mit Harvester oder Seilwinde rechnen nach Festmetern ab.',
    dur: 25,
    show: () => {
      const st = ext('sturm'),
        k = ext('kaefer');
      return !!((st && st.known && !st.done) || (k && k.known && !k.done) || tiereKaefer().length);
    },
    can: () => {
      const st = ext('sturm'),
        k = ext('kaefer');
      if (!((st && st.known && !st.done) || (k && k.known && !k.done) || tiereKaefer().length))
        return { no: true, text: 'Es ist kein Sturm- oder Käferholz bekannt.', why: '', src: '' };
      return null;
    },
    finish: (j, cx) => {
      const days = 2 + Math.floor(C.rng((cx.t | 0) * 17)() * 4);
      S.ext.termin = { t: Math.round(cx.t + days * 1440), who: j.who[0] };
      return { text: `der Unternehmer kommt in ${days} Tagen` };
    },
  });
  // feat/tiere: the spruces with bore dust (stage 1) of the animals' beetle model, once someone walked the forest – their ids
  const tiereKaefer = () => {
    const T = window.TIERE;
    if (!T || !T.kaefer || typeof T.kaefer.list !== 'function' || !STRAT.known('wald', 'klinge')) return [];
    try {
      return T.kaefer
        .list()
        .filter(k => k.stage === 1)
        .map(k => k.id);
    } catch (e) {
      return [];
    }
  };
  STRAT.event.define({
    id: 'termin',
    label: 'Der Forstunternehmer war da',
    chance: cx => (ext('termin') && cx.t >= ext('termin').t ? 1 : 0),
    run: () => {
      const st = ext('sturm'),
        k = ext('kaefer'),
        ids = [];
      if (st && st.known && !st.done) ids.push(...st.ids);
      if (k && k.known && !k.done) ids.push(...k.ids);
      // feat/tiere: their beetle spruces with bore dust, known from the forest walk – out before the brood flies (KERN 'fell' stops it there)
      const tk = tiereKaefer();
      for (const id of tk) if (!ids.includes(id)) ids.push(id);
      let vol = 0,
        n = 0;
      for (const id of ids) {
        const r = FELL.simFell(id, { any: true, q: 0.95, who: 'Forstunternehmer' });
        if (r) {
          vol += r.vol;
          n++;
        }
      }
      if (st && st.known) st.done = true;
      if ((k && k.known) || tk.length) {
        if (k && k.known) k.done = true;
        STRAT.style(3, 'Käferbäume rechtzeitig aus dem Wald');
      }
      delete S.ext.termin;
      STRAT.book(-vol * RATE, `Forstunternehmer: ${n} Bäume, ${de(vol, 1)} fm`, 'holz');
      return {
        text: `Der Forstunternehmer hat ${n} Bäume gefällt (${de(vol, 1)} fm) – die Stämme liegen am Waldweg zum Rücken.`,
      };
    },
  });
  // ---------------- machine breakdowns ----------------
  // a loud machine at work can fail (chance per working hour); Christoph on site halves it; repaired by the job „reparieren“ or his ability
  const BROKE = {
    saegen30: ['Blockbandsäge', 'Das Sägeband ist gerissen.', 35],
    saegen52: ['Blockbandsäge', 'Das Sägeband ist gerissen.', 35],
    maehen: ['Rasenmäher', 'Der Mäher springt nicht mehr an (Zündkerze).', 8],
    brett: ['Tischkreissäge', 'Der Spaltkeil ist verbogen, das Blatt stumpf.', 45],
    ruecken: ['Seilwinde', 'Das Seil ist angerissen – nie mit einem beschädigten Seil ziehen.', 60],
  };
  S.broken = S.broken || [];
  KERN.on('strategie:auftrag', d => {
    if (!d || d.state !== 'begonnen' || !BROKE[d.def]) return;
    const j = STRAT.job.of(d.id);
    if (!j) return;
    const chris = Object.keys(S.people).includes('christoph') && STRAT.present('christoph').ok;
    const h = j.dur / 60,
      p = Math.min(0.5, h * 0.015 * (chris ? 0.5 : 1)),
      r = C.rng(((STRAT.S.t | 0) * 31 + d.id.length) | 0)();
    if (r < p) {
      j.d.breakAt = 0.2 + r * 3;
      j.d.breaks = BROKE[d.def][0];
    }
  });
  // the breakdown happens during the work (strategie/st_modus.js calls step; this wraps nothing – it checks per frame)
  KERN.tick(() => {
    for (const j of STRAT.job.running()) {
      if (j.st !== 'work' || j.d.breakAt == null) continue;
      if (j.done / Math.max(1, j.dur) < j.d.breakAt) continue;
      const [m, text, eur] = BROKE[j.def];
      j.d.breakAt = null;
      if (!S.broken.includes(m)) S.broken.push(m);
      S.ext.parts = (S.ext.parts || 0) + eur;
      STRAT.note(`${m}: ${text}`, {
        kind: 'ereignis',
        why: 'Maschinen verschleißen: Bänder, Ketten, Zündkerzen, Seile. Wer sie pflegt und rechtzeitig tauscht, hat weniger Ausfälle.',
        src: 'Herstellerangaben, Wartungspläne',
      });
      STRAT.emit('kaputt', { machine: m, job: j.id });
    }
  }, 'strategie/kaputt');
  const MACH_OF = {
    saegen30: 'Blockbandsäge',
    saegen52: 'Blockbandsäge',
    maehen: 'Rasenmäher',
    brett: 'Tischkreissäge',
    ruecken: 'Seilwinde',
  };
  for (const id of Object.keys(MACH_OF)) {
    const J = STRAT.job.get(id);
    if (!J) continue;
    const can0 = J.can;
    J.can = cx => {
      if (S.broken.includes(MACH_OF[id]))
        return {
          no: true,
          text: `${MACH_OF[id]} ist kaputt – erst reparieren.`,
          why: 'Mit einer beschädigten Maschine zu arbeiten ist gefährlich und macht den Schaden größer.',
          src: 'Betriebssicherheitsverordnung: Arbeitsmittel nur in sicherem Zustand',
        };
      return can0 ? can0(cx) : null;
    };
  }
  STRAT.job.define({
    id: 'reparieren',
    pose: 'bonnet',
    label: 'Maschine reparieren',
    place: 'werkstatt',
    people: [1, 1],
    skill: 'maschinen',
    min: 3,
    heavy: 0.3,
    xp: 1.5,
    order: 40,
    show: () => S.broken.length > 0,
    text: 'Ersatzteile holen, einbauen, einstellen.',
    learn:
      'Ein neues Sägeband für eine kleine Blockbandsäge kostet um 35 €, eine Zündkerze 8 €. Ein Seil mit gerissenen Litzen wird ersetzt, nicht geflickt.',
    dur: 90,
    can: () => (S.broken.length ? null : { no: true, text: 'Es ist nichts kaputt.', why: '', src: '' }),
    finish: () => {
      const m = S.broken.shift(),
        eur = S.ext.parts || 0;
      S.ext.parts = 0;
      if (eur) STRAT.book(-eur, 'Ersatzteile: ' + m, 'werkstatt');
      return { text: m + ' läuft wieder' };
    },
  });
  // ---------------- a big order with a short date ----------------
  STRAT.event.define({
    id: 'grossbestellung',
    label: 'Eine Großbestellung',
    chance: cx => {
      if (S.orders.some(o => o.st === 'offen')) return 0;
      const done = S.orders.filter(o => o.st === 'geliefert').length;
      return done ? 0.02 + Math.max(0, S.style) * 0.0004 : 0;
    },
    run: cx => {
      const n = 8 + Math.floor(C.rng((cx.t | 0) * 19)() * 5);
      STRAT.order.add({
        key: 'gross' + Math.round(cx.t),
        title: n + ' Schneidebretter Eiche für den Weihnachtsmarkt',
        who: 'der Weihnachtsmarkt in Schleusingen',
        n,
        minStars: 4,
        days: 12,
        price: D.PRICES.brett.eur,
      });
      return { text: `Großbestellung: ${n} Bretter mit mindestens vier Sternen in zwölf Tagen.` };
    },
  });
  // ---------------- safety: tired work and lost days (no blood) ----------------
  KERN.on('strategie:auftrag', d => {
    if (!d || d.state !== 'fertig') return;
    const J = STRAT.job.get(d.def);
    if (!J || !(J.heavy >= 0.5) || !d.who) return;
    for (const id of d.who) {
      const p = S.people[id];
      if (!p || p.nd.energy > 30) continue;
      const r = C.rng(((STRAT.S.t | 0) * 37 + id.length * 7) | 0)();
      if (r < 0.25) {
        const eh = p.certs.includes('ersthilfe') || Object.values(S.people).some(q => q.certs.includes('ersthilfe'));
        const days = eh ? 2 : 4;
        p.hurt = Math.round((d.t ?? STRAT.S.t) + days * 1440);
        STRAT.note(`${D.PEOPLE[id].name} hat sich bei „${J.label}“ verletzt – ${days} Tage Pause.`, {
          kind: 'ereignis',
          why: 'Müde macht man Fehler: die meisten Unfälle bei der Holzarbeit passieren am Ende eines langen Tages. Pausen, genug Schlaf und Essen halten wach.',
          src: 'SVLFG Unfallstatistik; DGUV',
        });
        STRAT.style(-2, 'Zu müde gearbeitet: ' + D.PEOPLE[id].name);
        STRAT.emit('unfall', { who: id, days });
      }
    }
  });
  // ---------------- favours: helping the neighbours (they help you in return) ----------------
  STRAT.job.define({
    id: 'hubert_helfen',
    pose: 'chop',
    label: 'Hubert bei den Trockenhütten helfen',
    place: 'hubert',
    people: [1, 2],
    skill: 'holz',
    min: 1,
    heavy: 0.5,
    order: 10,
    text: 'Scheite spalten und in Huberts Trockenhütchen stapeln – er erzählt dabei vom Dorf.',
    learn:
      'Scheitholz trocknet unter Dach in einem bis zwei Sommern auf unter 20 % – erst dann brennt es sauber (1. BImSchV: höchstens 25 % Feuchte).',
    dur: 120,
    finish: j => {
      STRAT.favour('hubert', 2, 'Hilfe bei den Trockenhütten');
      STRAT.style(2, 'Hubert geholfen');
      return { text: 'Hubert freut sich (♥ +2)' };
    },
  });
  STRAT.job.define({
    id: 'ronald_helfen',
    pose: 'pick',
    label: 'Ronald beim Heu für die Ziegen helfen',
    place: 'ronald',
    people: [1, 2],
    skill: 'garten',
    min: 1,
    heavy: 0.5,
    order: 10,
    text: 'Heu umsetzen, den Ziegenstall ausmisten, den Zaun prüfen.',
    learn: 'Eine Ziege frisst am Tag 2–3 kg Heu; im Winter braucht Ronalds Herde dafür einen ganzen Heuboden.',
    dur: 120,
    finish: () => {
      STRAT.favour('ronald', 2, 'Hilfe mit den Ziegen');
      STRAT.style(2, 'Ronald geholfen');
      return { text: 'Ronald freut sich (♥ +2)' };
    },
  });
  // a hurt person waits for the lost days (st_modus present() asks this)
  STRAT.person.hurt = id => {
    const p = S.people[id];
    return p && p.hurt && p.hurt > STRAT.S.t ? p.hurt : 0;
  };
  void STHOLZ;
  void W;
  return { spruces, RATE, BROKE };
})();
window.STEREIG = STEREIG;
