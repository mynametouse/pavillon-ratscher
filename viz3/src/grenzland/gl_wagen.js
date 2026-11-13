// ===================== feat/grenzland: the shop on wheels at the Anger (GLWAGEN) =====================
// A sales van as they really tour the villages of Thuringia (bakers, butchers, grocers on a timetable): it stands south of the Anger's
// green (grenzland/gl_orte.js builds it), open in the morning and in the late afternoon by the game clock, shut in between. Behind the
// counter the saleswoman (GLDATA.CAST.haendler, loaded only while somebody is near). „Einkaufen“ opens the shop in the mode's panel of
// choices: the shelves by kind (a bite to eat at once, groceries – among them what the cook from Suhl asks for –, angling: bait and the
// guest permit for the reservoir, and under the counter what the clique's friends get), things go into a basket, the sum is paid in whole
// euros (she never has small change); she buys fish (per piece), all of them or all but one big carp. Goods, hours and prices are
// GLNLOGIK (unit-tested). Interface: GLWAGEN.open() → Promise<last thing bought | null> · kaufen({ k: n }) · verkaufen(keep) · offen().
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { GLNLOGIK } from './gl_neben_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GLORTE } from './gl_orte.js';
export const GLWAGEN = (() => {
  const N = GLNLOGIK,
    S = { frau: null, loading: false, busy: false, acc: 0, gruss: 0 };
  const WER = GLDATA.CAST.haendler.name;
  // the shelves
  const REGAL = [
    { g: 'imbiss', name: 'Auf die Hand', ks: ['bratwurst', 'kaffee'] },
    { g: 'laden', name: 'Lebensmittel und Bedarf', ks: ['milchreis', 'worcester', 'kanister'] },
    { g: 'angel', name: 'Angelbedarf', ks: ['mais', 'wurm', 'blinker', 'angelkarte'] },
    { g: 'theke', name: 'Unter der Theke', ks: ['boeller'] },
  ];
  const ware = k => N.WAREN.find(w => w.k === k);
  // what she shows: the things under the counter only to those the clique knows, the permit only once
  const bekannt = () => GL.has('karte1') || !!(GL.m.clique && GL.m.clique.st === 'erledigt');
  const zeigt = w => !!w && (!w.unter || bekannt()) && (!w.einmal || !GL.has(w.k));
  const waren = R => R.ks.map(ware).filter(zeigt);
  const offen = () => GL.on && GL.era === 'heute' && N.offen(CLOCK.t);
  const sagt = (text, ms) => GLHUD.sub(WER, text, ms);
  const korbText = k =>
    N.WAREN.filter(w => k[w.k])
      .map(w => (k[w.k] > 1 ? k[w.k] + '× ' : '') + w.name.replace(/ \(.*\)$/, ''))
      .join(', ');
  // ---- buying: the basket is paid, the things change hands ----
  function kaufen(korb) {
    const kb = N.korb(korb);
    if (!GL.on || !kb.zahlen) return { ok: false };
    if (!GL.pay(kb.zahlen, 'Verkaufswagen')) {
      PLAY.think(GLDATA.T.geldFehlt, 2200);
      sagt('Anschreiben gibt’s bei mir nicht. Das hat hier noch keiner zurückgezahlt.');
      return { ok: false, geld: true };
    }
    GLTON.fx('geld');
    let last = null,
      sofort = null;
    for (const w of N.WAREN) {
      const c = Math.floor(korb[w.k] || 0);
      if (c <= 0) continue;
      last = w.k;
      if (w.sofort) sofort = w;
      else GL.add(w.k, c * (w.n || 1));
      for (let j = 0; j < c; j++) GL.emit('kauf', { k: w.k });
    }
    sagt(
      sofort
        ? sofort.gut
        : kb.zahlen > kb.sum
          ? 'Macht ' + kb.zahlen + ' €. Kleingeld hab ich keins – stimmt so, ja?'
          : 'Macht ' + kb.zahlen + ' €. Danke schön!'
    );
    return { ok: true, last, zahlen: kb.zahlen, sum: kb.sum };
  }
  // ---- selling fish: all, or all but what one keeps ({ thing: count }) ----
  function verkaufen(keep = {}) {
    const a = N.ankauf(GL.inv, keep);
    if (!GL.on || !a.n) return { ok: false, n: 0, eur: 0 };
    for (const [k, c] of a.liste) GL.use(k, c);
    GL.earn(a.eur, 'Fisch');
    GLTON.fx('geld');
    GL.emit('verkauf', { n: a.n, eur: a.eur });
    sagt(
      a.n > 3 ? 'Na, da war aber einer fleißig. ' + a.eur + ' €, bitte.' : a.eur + ' € dafür. Frischer geht’s nicht.'
    );
    return { ok: true, n: a.n, eur: a.eur };
  }
  async function fische() {
    const all = N.ankauf(GL.inv),
      keep = GL.has('karpfen_gross') ? N.ankauf(GL.inv, { karpfen_gross: 1 }) : null,
      liste = a => a.liste.map(([k, c]) => (c > 1 ? c + '× ' : '') + N.FISCHNAME[k]).join(', '),
      opts = [{ t: 'Alle verkaufen: ' + all.eur + ' €', s: liste(all) }];
    if (keep && keep.n) opts.push({ t: 'Einen großen Karpfen behalten: ' + keep.eur + ' €', s: liste(keep) });
    opts.push({ t: 'Lieber behalten' });
    const i = await GLHUD.wahl('Fisch verkaufen', 'Frisch aus der Talsperre? Zeig her.', opts);
    if (i === 0) verkaufen();
    else if (i === 1 && opts.length === 3) verkaufen({ karpfen_gross: 1 });
  }
  // one shelf: every tap puts one more into the basket
  async function regal(R, korb) {
    for (;;) {
      const W = waren(R).filter(w => !(w.einmal && korb[w.k])),
        opts = W.map(w => ({
          t: w.name,
          s: N.euro(w.eur) + (w.n ? ' · ' + w.n + ' Stück' : '') + (korb[w.k] ? ' · im Korb: ' + korb[w.k] : ''),
        }));
      opts.push({ t: 'Zurück' });
      const i = await GLHUD.wahl(
        R.name,
        'Im Korb: ' + (korbText(korb) || 'nichts') + ' (' + N.euro(N.korb(korb).sum) + ')',
        opts
      );
      if (i < 0 || i >= W.length || !GL.on) return;
      korb[W[i].k] = (korb[W[i].k] || 0) + 1;
      GLTON.fx('tick');
    }
  }
  // ---- the shop ----
  async function open() {
    if (S.busy || !GL.on) return null;
    if (!offen()) {
      PLAY.think('Der Verkaufswagen ist zu. Er hält ' + N.zeitenText() + ' am Anger.', 4200);
      return null;
    }
    S.busy = true;
    const korb = {};
    let last = null;
    try {
      sagt('Na, ' + GL.name() + '? Was darf’s sein?', 2600);
      for (;;) {
        const kb = N.korb(korb),
          fi = N.ankauf(GL.inv),
          n = Object.values(korb).reduce((a, b) => a + b, 0),
          RS = REGAL.filter(R => waren(R).length),
          opts = RS.map(R => ({
            t: R.name,
            s: waren(R)
              .map(w => w.name.replace(/ \(.*\)$/, ''))
              .join(', '),
          }));
        if (fi.n) opts.push({ k: 'fisch', t: 'Fisch verkaufen', s: fi.n + ' Stück · ' + fi.eur + ' €' });
        if (n)
          opts.push({ k: 'zahlen', t: 'Bezahlen: ' + kb.zahlen + ' €', s: korbText(korb) + ' = ' + N.euro(kb.sum) });
        opts.push({ k: 'ende', t: n ? 'Doch nichts' : last ? 'Das war’s' : 'Nichts, danke' });
        const i = await GLHUD.wahl(
          'Verkaufswagen',
          'Du hast ' + GL.geld + ' €.' + (n ? ' Im Korb: ' + korbText(korb) + '.' : ''),
          opts
        );
        if (i < 0 || !GL.on || !opts[i]) break;
        if (i < RS.length) await regal(RS[i], korb);
        else if (opts[i].k === 'fisch') await fische();
        else if (opts[i].k === 'zahlen') {
          const r = kaufen(korb);
          if (r.ok) {
            last = r.last;
            for (const k of Object.keys(korb)) delete korb[k];
          }
        } else break;
      }
    } finally {
      S.busy = false;
    }
    if (GL.on && last) sagt('Tschüss! Und grüß mir ' + GL.name(GL.other()) + '.', 2400);
    return last;
  }
  // ---- the saleswoman: behind the counter while the van is open and somebody is near ----
  async function frauHolen() {
    if (S.loading || S.frau) return;
    S.loading = true;
    const F = await GLFIG.make('haendler', {});
    S.loading = false;
    if (!F) return;
    if (!GLORTE.built || S.frau) return GLFIG.drop(F);
    F.knows = true; // she knows everybody at the Anger
    F.r = 22;
    S.frau = F;
    stellen();
  }
  function stellen() {
    const F = S.frau,
      q = GLORTE.WG.frau;
    if (!F || !q) return;
    const da = GLORTE.offen && GLORTE.era === 'heute';
    if (da && (!F.g.visible || Math.abs(F.z - q.z) > 0.01)) {
      GLFIG.place(F, q.xy[0], q.xy[1], q.hd);
      F.z = q.z; // on the van's floor
    } else if (!da) F.g.visible = false;
  }
  function tick(dt) {
    if ((S.acc += dt) < 1) return;
    S.acc = 0;
    const o = KERN.where() || [P.x, P.y],
      d = Math.hypot(o[0] - GLORTE.WG.o[0], o[1] - GLORTE.WG.o[1]),
      da = GLORTE.offen && GLORTE.era === 'heute';
    if (da && d < 110 && !S.frau) frauHolen();
    else if (S.frau && (d > 190 || !da)) {
      if (d > 190) {
        GLFIG.drop(S.frau);
        S.frau = null;
      } else stellen();
    } else if (S.frau) stellen();
    // a word to whoever comes by
    if (da && S.frau && d < 5 && !S.busy && performance.now() - S.gruss > 90000) {
      S.gruss = performance.now();
      sagt(
        ['Bratwurst ist frisch. Der Senf auch.', 'Na, wieder im Lande?', 'Heute im Angebot: alles, was noch da ist.'][
          Math.floor(Math.random() * 3)
        ],
        2600
      );
    }
  }
  GLORTE.hook({
    build() {
      KERN.act({
        id: 'gl:wagen',
        r: 2.6,
        prio: 0.3,
        label: () =>
          GL.on && GL.era === 'heute' && P.mode === 'walk' && !S.busy
            ? offen()
              ? 'Einkaufen'
              : 'Verkaufswagen (geschlossen)'
            : null,
        pos: () => [GLORTE.WG.kunde[0], GLORTE.WG.kunde[1], GLORTE.WG.z + 1.2],
        run: () => {
          open();
        },
      });
    },
    drop() {
      KERN.unact('gl:wagen');
      if (S.frau) GLFIG.drop(S.frau);
      S.frau = null;
      S.busy = false;
    },
    tick,
    offen: stellen,
    era: stellen,
  });
  return Object.assign(S, { open, kaufen, verkaufen, offen, REGAL });
})();
window.GLWAGEN = GLWAGEN;
