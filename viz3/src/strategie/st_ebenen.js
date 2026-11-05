// ===================== feat/strategie: the layers of the map one can switch (STEBENEN) – nature, crises, traffic =====================
// Falko 23:30: one mirror world with switchable lenses and layers. Each layer draws into the overlay of strategie/st_hud.js (an SVG over
// the plan view); pr(x, y, dz) gives the screen point dz metres above the ground there. What a layer shows is what is known: the forest's
// marked trees, windthrow and beetle trees only after someone looked (exploration).
import { FELL } from '../world/fell.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { STRAT } from './st_modus.js';
import { STHOLZ } from './st_holz.js';
export const STEBENEN = (() => {
  const S = STRAT.S;
  const f1 = v => v.toFixed(1);
  const dot = (q, r, cls, fill, title) =>
    `<circle class="${cls}" cx="${f1(q[0])}" cy="${f1(q[1])}" r="${r}" fill="${fill}" stroke="rgba(0,0,0,.55)" stroke-width="1">${title ? `<title>${title}</title>` : ''}</circle>`;
  // ---- nature: the forest as far as it is known (marked trees orange, stumps brown, windthrow dark red, beetle trees red) ----
  STRAT.layer.define({
    id: 'natur',
    draw: (pr, W, H) => {
      if (P.th > 700 || !STRAT.known('wald', 'klinge')) return '';
      const FOREST = window.FOREST;
      if (!FOREST) return '';
      let h = '';
      const r = P.th < 120 ? 3.5 : 2.4,
        on = q => q[2] < 1 && q[0] > -10 && q[1] > -10 && q[0] < W + 10 && q[1] < H + 10;
      for (const t of STHOLZ.marked()) {
        const q = pr(t.x, t.y, 0.5);
        if (on(q)) h += dot(q, r, 'nat', '#ff7a1a', 'markiert');
      }
      for (const rec of Object.values(FELL.trees || {})) {
        if (rec.st !== 'done') continue;
        const t = FOREST.byId(rec.id);
        if (!t) continue;
        const q = pr(t.x, t.y, 0.3);
        if (on(q)) h += dot(q, r * 0.8, 'nat', '#7a5230', 'gefällt');
      }
      const st = S.ext.sturm,
        k = S.ext.kaefer;
      for (const [E, col, txt] of [
        [st, '#8a1c1c', 'Sturmholz'],
        [k, '#e0312b', 'Borkenkäfer'],
      ]) {
        if (!E || !E.known || E.done) continue;
        for (const id of E.ids) {
          const t = FOREST.byId(id);
          if (!t) continue;
          const q = pr(t.x, t.y, 0.5);
          if (on(q)) h += dot(q, r + 0.6, 'nat', col, txt);
        }
      }
      return h;
    },
  });
  // ---- crises: what needs attention, at its place ----
  STRAT.layer.define({
    id: 'krisen',
    draw: (pr, W, H) => {
      const L = [];
      if ((S.broken || []).length) L.push(['werkstatt', 'kaputt: ' + S.broken.join(', ')]);
      if (S.orders.some(o => o.st === 'verspätet')) L.push(['werkstatt', 'Bestellung zu spät']);
      const st = S.ext.sturm,
        k = S.ext.kaefer;
      if (st && st.known && !st.done) L.push(['klinge', 'Sturmholz liegt']);
      if (k && k.known && !k.done) L.push(['klinge', 'Borkenkäfer!']);
      if (S.power && S.power.none) L.push(['werkstatt', 'kein Strom']);
      if (S.essen != null && S.essen < 3) L.push(['bungalow', 'kein Essen mehr']);
      let h = '',
        n = {};
      for (const [pid, txt] of L) {
        const c = STRAT.place.pos(pid);
        if (!c) continue;
        const q = pr(c[0], c[1], 1),
          k2 = (n[pid] = (n[pid] || 0) + 1);
        if (q[2] >= 1) continue;
        h += `<g class="kr"><circle cx="${f1(q[0] - 13)}" cy="${f1(q[1] - 13 - (k2 - 1) * 16)}" r="7" fill="#d8322a" stroke="#fff" stroke-width="1.2"/><text x="${f1(q[0] - 13)}" y="${f1(q[1] - 9.5 - (k2 - 1) * 16)}" text-anchor="middle" style="fill:#fff;font:700 10px system-ui">!</text><text x="${f1(q[0] - 3)}" y="${f1(q[1] - 9 - (k2 - 1) * 16)}" style="fill:#ffd9d4;font:600 10.5px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.7);stroke-width:3px">${txt}</text></g>`;
      }
      return h;
    },
  });
  // ---- traffic: the cars of the village's life on the streets (verkehr/*) ----
  STRAT.layer.define({
    id: 'verkehr',
    draw: (pr, W, H) => {
      if (P.th > 2500) return '';
      let h = '';
      for (const c of VAUTO.cars || []) {
        if (!Number.isFinite(c.x)) continue;
        const q = pr(c.x, c.y, 0.8);
        if (q[2] >= 1 || q[0] < -20 || q[1] < -20 || q[0] > W + 20 || q[1] > H + 20) continue;
        const a = ((c.hd || 0) * 180) / Math.PI;
        h += `<rect x="${f1(q[0] - 3)}" y="${f1(q[1] - 6)}" width="6" height="12" rx="2" fill="#cfd6de" stroke="#222" stroke-width="1" transform="rotate(${a.toFixed(0)} ${f1(q[0])} ${f1(q[1])})"/>`;
      }
      // feat/bus: its buses when it is there (BUS.state().inst → [{ x, y, line }])
      const B = window.BUS;
      if (B && (typeof B.list === 'function' || typeof B.state === 'function'))
        try {
          const list = typeof B.list === 'function' ? B.list() : B.state().inst;
          for (const b of list || []) {
            const q = pr(b.x, b.y, 1.5);
            if (q[2] < 1)
              h += `<rect x="${f1(q[0] - 4)}" y="${f1(q[1] - 10)}" width="8" height="20" rx="2" fill="#f2c500" stroke="#222" stroke-width="1"/>`;
          }
        } catch (e) {}
      return h;
    },
  });
  // ---- the dog (feat/tiere, window.HUND): his symbol among the people; what he does of his own accord comes as a notice with „Loben“ and
  // „Tadeln“ – Black & White: praise and scolding shape what he does more often (tiere/tiere_hund.js, HUND.lob(±1) answers in a sentence) ----
  const DOG = {
    hueten: 'die Ziegen zusammengetrieben',
    vertreiben: 'das Wild aus dem Garten getrieben',
    jagen: 'dem Wild weit hinterhergejagt',
    suchen: 'eine Spur gefunden',
    bellen: 'einen Nachbarn angebellt',
    ruhig: 'bei den Leuten ruhig geblieben',
    kommen: 'auf den Pfiff gekommen',
  };
  STRAT.layer.define({
    id: 'leute',
    draw: (pr, W, H) => {
      const D = window.HUND;
      if (!D || D.on === false || !Number.isFinite(D.x) || P.th > 900) return '';
      const q = pr(D.x, D.y, 0.6);
      if (q[2] >= 1 || q[0] < -20 || q[1] < -20 || q[0] > W + 20 || q[1] > H + 20) return '';
      const r = P.th < 120 ? 5.5 : 4,
        name = String(D.name || 'Hund');
      return `<g class="dog"><circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${r}" fill="#2b2420" stroke="#e3b04b" stroke-width="2"><title>${name}</title></circle>${P.th < 260 ? `<text x="${f1(q[0] + r + 3)}" y="${f1(q[1] + 3.5)}" style="fill:#f3e2b8;font:600 10.5px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.7);stroke-width:3px">${name}</text>` : ''}</g>`;
    },
  });
  let dogT = -1e9;
  const dogLast = {};
  KERN.on('hund:tat', d => {
    const D = window.HUND,
      now = performance.now() / 1000;
    if (!STRAT.on || !D || !d || !DOG[d.tat] || typeof D.lob !== 'function') return;
    if (now - dogT < 12 || now - (dogLast[d.tat] || -1e9) < 60) return;
    dogT = dogLast[d.tat] = now;
    const name = D.name || 'Der Hund';
    STRAT.note(name + ' hat ' + DOG[d.tat] + '.', {
      kind: 'hund',
      acts: [
        { label: 'Loben', fn: () => D.lob(1) },
        { label: 'Tadeln', fn: () => D.lob(-1) },
      ],
    });
  });
  return { DOG };
})();
