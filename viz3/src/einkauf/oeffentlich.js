// ===================== feat/laeden-leben 9: the public buildings – staff at their hours and something meaningful to do (OEFFENTLICH) =====================
// Falko (17.11.2026 13:27): „öffentliche Gebäude sollten, so gut es geht, zugänglich sein und dann eben auch entsprechende auch
// Öffnungszeiten haben, aber eben auch entsprechende Optionen, vielleicht die sogar sinnvoll sind, entweder für die Quest oder für
// Sidequests oder einfach Inventarisierung von Dingen oder lustige Nebenschauplätze.“ Each building has its hours in OEFFNUNG
// (einkauf/oeffnung.js) and, while open, a person at its counter (LLEBEN.posten: a figure of the streets, lit by the borrowed lamp):
//   - the town hall of Schleusingen (welt/schleusingen.js, the Bürgerbüro's counter in the hall): ask at the counter – the town's opening
//     hours, a certificate of registration (Meldebescheinigung, 10 €), yellow bags (free, as Thuringian towns hand them out), the election
//     office of the Ortsvorsteher system (amt/amt.js) when it runs; closed: the hours;
//   - the fire station of Ratscher in the old school (dorf/dorf_school.js, read only): its notice box – the fire brigade's service
//     evening, volunteers wanted (an event for side quests).
// Each option is an event for the side quests (KERN 'oeffentlich' { id, was }) and, where something is handed over, a thing in the
// inventory (INVENTAR).
//   OEFFENTLICH.orte() → [{ id, name, offen, zeiten, x, y }] · OEFFENTLICH.oeffnen(id) (the panel) · status()
import { KERN } from '../core/kern.js';
import { toast } from '../audio/audio.js';
import { P } from '../game/walkable.js';
import { SCHL } from '../welt/schleusingen.js';
import { DSCHOOL } from '../dorf/dorf_school.js';
import { OEFFNUNG } from './oeffnung.js';
import { WAREN } from './waren.js';
import { GELD } from './geld.js';
import { INVENTAR } from './inventar.js';
import { LLEBEN } from '../laeden/leben.js';
import { LKAUF } from '../laeden/kauf.js';
import { LIPLAN } from '../laeden/innen_plan.js';
export const OEFFENTLICH = (() => {
  const S = { on: true, last: null, err: '' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const emit = (id, was, d) => KERN.emit('oeffentlich', Object.assign({ id, was }, d || {}));
  // ---- the town hall: the Bürgerbüro ----
  const hall = () =>
    SCHL && SCHL.on && SCHL.state === 'ready' && SCHL.rathaus && SCHL.rathaus.spots ? SCHL.rathaus : null;
  let hallPost = null;
  function rathausPost() {
    const R = hall();
    if (!R || !R.spots.clerk || hallPost) return;
    const c = R.spots.clerk;
    hallPost = LLEBEN.posten
      ? LLEBEN.posten({
          id: 'rathaus',
          x: c.x,
          y: c.y,
          hd: (c.yaw * Math.PI) / 180,
          z: () => R.floor,
          fig: 'vk_f15',
          near: 22,
          arbeit: 'interactLoop',
          offen: () => OEFFNUNG.offen('rathaus') === true && !!hall(),
        })
      : null;
  }
  const amtLaeuft = () => {
    const A = window.AMT;
    return !!(A && A.ST && A.ST.phase && A.ST.phase !== 'none' && typeof A.rathaus === 'function');
  };
  function rathaus() {
    const R = hall();
    if (!R) return;
    const open = OEFFNUNG.offen('rathaus');
    if (!open) {
      LKAUF.zeige(
        '<h3>Bürgerbüro Schleusingen<button type="button" aria-label="Schließen">×</button></h3><div class="say">Das Bürgerbüro hat geschlossen – ' +
          esc(OEFFNUNG.text('rathaus')) +
          '.</div><div class="say">Öffnungszeiten: ' +
          esc(OEFFNUNG.zeiten('rathaus')) +
          '</div>'
      );
      return;
    }
    if (hallPost) hallPost.redet = true;
    const btn = (k, t, main) =>
      '<button type="button" class="b' + (main ? ' main' : '') + '" data-k="' + k + '">' + esc(t) + '</button>';
    const draw = say => {
      LKAUF.zeige(
        '<h3>Bürgerbüro Schleusingen<button type="button" aria-label="Schließen">×</button></h3><div class="say">' +
          esc(say || '„Guten Tag. Was kann ich für Sie tun?“') +
          '</div><div class="btns">' +
          btn('zeiten', 'Wann hat was offen?') +
          btn('melde', 'Meldebescheinigung · 10,00 €') +
          btn('saecke', 'Gelbe Säcke abholen') +
          (amtLaeuft() ? btn('amt', 'Wahlamt, Bauamt, Stadtrat', true) : '') +
          btn('tschuess', 'Danke, das war’s') +
          '</div><div class="say">In der Geldbörse: ' +
          esc(GELD.text()) +
          '</div>',
        p => {
          for (const b of p.querySelectorAll('button[data-k]'))
            b.onclick = () => {
              const k = b.dataset.k;
              if (k === 'zeiten') {
                const L = ['rathaus', 'museum', 'bibliothek', 'johannis', 'post']
                  .map(id => OEFFNUNG.info(id))
                  .filter(Boolean)
                  .map(i => i.name + ': ' + i.zeiten);
                emit('rathaus', 'zeiten');
                draw('„Hier, die Zeiten:“\n' + L.join('\n'));
              } else if (k === 'melde') {
                if (!GELD.zahlen(1000, 'Meldebescheinigung'))
                  return draw('„Das kostet 10 Euro – die haben Sie gerade nicht dabei.“');
                INVENTAR.add('meldebescheinigung', 1);
                emit('rathaus', 'meldebescheinigung');
                draw('„Einen Moment … Ihre Meldebescheinigung. Das macht 10 Euro. Bitte schön.“');
              } else if (k === 'saecke') {
                INVENTAR.add('gelbesaecke', 1);
                emit('rathaus', 'gelbesaecke');
                draw('„Eine Rolle gelbe Säcke – die gibt’s hier umsonst. Abgeholt wird alle zwei Wochen.“');
              } else if (k === 'amt') {
                LKAUF.close();
                window.AMT.rathaus(true);
              } else {
                if (hallPost) hallPost.redet = false;
                LKAUF.close();
              }
            };
        }
      );
    };
    draw();
    emit('rathaus', 'schalter');
  }
  KERN.act({
    id: 'oeffentlich:rathaus',
    r: 2.0,
    prio: 0.35,
    pos: () => {
      const R = hall();
      return R && R.counter ? [R.counter[0], R.counter[1], R.floor + 1.1] : null;
    },
    label: () => {
      const R = hall();
      if (!R) return null;
      return OEFFNUNG.offen('rathaus')
        ? 'Bürgerbüro: am Schalter fragen'
        : 'Bürgerbüro – geschlossen (' + OEFFNUNG.zeiten('rathaus') + ')';
    },
    run: () => rathaus(),
  });
  // ---- the fire station of Ratscher: the notice box beside the old school's door ----
  const notice = () => (DSCHOOL && DSCHOOL.built && DSCHOOL.noticeAt ? DSCHOOL.noticeAt : null);
  function feuerwehr() {
    const open = OEFFNUNG.offen('feuerwehr');
    LKAUF.zeige(
      '<h3>Feuerwehr Ratscher<button type="button" aria-label="Schließen">×</button></h3><div class="bon">' +
        esc(
          'FREIWILLIGE FEUERWEHR RATSCHER\n\nDienst: ' +
            OEFFNUNG.zeiten('feuerwehr') +
            '\nim Feuerwehrhaus (Alte Schule)\n\nMitmachen kann jede und jeder ab 16 –\neinfach zum Dienstabend kommen.\n\nNotruf 112'
        ) +
        '</div><div class="say">' +
        (open
          ? 'Gerade ist Dienst – drinnen brennt Licht.'
          : 'Gerade ist niemand da – ' + esc(OEFFNUNG.text('feuerwehr')) + '.') +
        '</div><div class="btns"><button type="button" class="b main" data-k="mit">Zum nächsten Dienst vormerken</button><button type="button" class="b" data-k="ok">Weiter</button></div>',
      p => {
        p.querySelector('[data-k=mit]').onclick = () => {
          emit('feuerwehr', 'mitmachen');
          toast('Vorgemerkt: der nächste Dienst der Feuerwehr – ' + OEFFNUNG.text('feuerwehr') + '.', 4200);
          LKAUF.close();
        };
        p.querySelector('[data-k=ok]').onclick = () => LKAUF.close();
      }
    );
    emit('feuerwehr', 'aushang');
  }
  KERN.act({
    id: 'oeffentlich:feuerwehr',
    r: 1.6,
    prio: 0.1,
    pos: () => {
      const n = notice();
      return n ? [n[0], n[1], (DSCHOOL.F ? DSCHOOL.F.zF : P.feet) + 1.3] : null;
    },
    label: () => (notice() ? 'Aushang der Feuerwehr lesen' : null),
    run: () => feuerwehr(),
  });
  // ---- the Stadtbibliothek (OSM: library east of the old town): at its door borrow a book (the reader's card 10 € a year) ----
  const BIB = [-738.34, 1336.38];
  let bibCard = false;
  // its door: the house that holds the OSM point, its door towards the street (CI picture bibliothek: the point lies inside the house);
  // { x, y } a step in front of the door, { nx, ny } outwards
  let bibD = null,
    bibOf = null;
  function bibTuer() {
    if (!SCHL || SCHL.state !== 'ready') return null;
    if (bibD && bibOf === SCHL.bld) return bibD;
    bibOf = SCHL.bld;
    const b = (SCHL.bld || []).find(q => q.f && LIPLAN.inPoly(q.f, BIB[0], BIB[1])),
      d = b && b.doorFac;
    if (d) {
      const x = d.ax + d.dx * d.u,
        y = d.ay + d.dy * d.u;
      bibD = { x: x + d.dy * 0.8, y: y - d.dx * 0.8, nx: d.dy, ny: -d.dx, haus: true };
    } else bibD = { x: BIB[0], y: BIB[1], nx: 0, ny: -1, haus: false };
    return bibD;
  }
  S.bibTuer = bibTuer;
  function bibliothek() {
    const open = OEFFNUNG.offen('bibliothek');
    if (!open) {
      LKAUF.zeige(
        '<h3>Stadtbibliothek Schleusingen<button type="button" aria-label="Schließen">×</button></h3><div class="say">Geschlossen – ' +
          esc(OEFFNUNG.text('bibliothek')) +
          '.\nÖffnungszeiten: ' +
          esc(OEFFNUNG.zeiten('bibliothek')) +
          '</div>'
      );
      return;
    }
    const books = [
      'Ein Krimi aus dem Thüringer Wald',
      'Ein Gartenbuch: Obstbäume schneiden',
      'Holzbearbeitung für Einsteiger',
      'Eine Chronik des Hennebergischen Landes',
    ];
    LKAUF.zeige(
      '<h3>Stadtbibliothek Schleusingen<button type="button" aria-label="Schließen">×</button></h3><div class="say">' +
        (bibCard || INVENTAR.has('buch')
          ? '„Schön, Sie wieder zu sehen. Was möchten Sie mitnehmen?“'
          : '„Guten Tag! Für die Ausleihe brauchen Sie einen Leseausweis – 10 Euro im Jahr.“') +
        '</div><div class="btns">' +
        books.map((t, i) => '<button type="button" class="b" data-b="' + i + '">' + esc(t) + '</button>').join('') +
        (INVENTAR.has('buch') ? '<button type="button" class="b" data-k="zurueck">Ein Buch zurückgeben</button>' : '') +
        '<button type="button" class="b" data-k="weg">Danke</button></div>',
      p => {
        for (const b of p.querySelectorAll('button[data-b]'))
          b.onclick = () => {
            if (!bibCard) {
              if (!GELD.zahlen(1000, 'Leseausweis Stadtbibliothek'))
                return toast('Für den Leseausweis reicht das Geld nicht.', 3000);
              bibCard = true;
            }
            INVENTAR.add('buch', 1);
            emit('bibliothek', 'ausleihen', { titel: books[+b.dataset.b] });
            toast('Ausgeliehen: „' + books[+b.dataset.b] + '“ – Rückgabe in vier Wochen.', 4200);
            LKAUF.close();
          };
        const z = p.querySelector('[data-k=zurueck]');
        if (z)
          z.onclick = () => {
            INVENTAR.take('buch', 1);
            emit('bibliothek', 'zurueck');
            toast('Das Buch ist zurück. Danke!', 2600);
            LKAUF.close();
          };
        p.querySelector('[data-k=weg]').onclick = () => LKAUF.close();
      }
    );
  }
  KERN.act({
    id: 'oeffentlich:bibliothek',
    r: 3,
    prio: -0.5,
    pos: () => {
      const d = bibTuer();
      return d ? [d.x, d.y, KERN.ground(d.x, d.y) + 1.2] : null;
    },
    label: () =>
      SCHL && SCHL.state === 'ready'
        ? OEFFNUNG.offen('bibliothek')
          ? 'Stadtbibliothek: Buch ausleihen'
          : 'Stadtbibliothek – geschlossen (' + OEFFNUNG.zeiten('bibliothek') + ')'
        : null,
    run: () => bibliothek(),
  });
  // the town hall's clerk once the town stands
  KERN.tick(() => {
    try {
      if (!hallPost && hall()) rathausPost();
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
    }
  }, 'oeffentlich');
  S.orte = () =>
    OEFFNUNG.liste()
      .map(id => OEFFNUNG.info(id))
      .filter(i => i && i.art !== 'laden')
      .map(i => ({ id: i.id, name: i.name, offen: OEFFNUNG.offen(i.id), zeiten: i.zeiten }));
  S.oeffnen = id =>
    id === 'rathaus' ? rathaus() : id === 'feuerwehr' ? feuerwehr() : id === 'bibliothek' ? bibliothek() : null;
  S.status = () => ({ hall: !!hall(), post: hallPost ? !!hallPost.p : null, notice: !!notice(), err: S.err });
  void WAREN;
  return S;
})();
window.OEFFENTLICH = OEFFENTLICH;
