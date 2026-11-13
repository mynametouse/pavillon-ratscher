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
      // feat/tiere: the spruces their beetle model attacks (bore dust, flown, dead) – known once someone walked the forest
      const TK = window.TIERE && TIERE.kaefer && typeof TIERE.kaefer.list === 'function' ? TIERE.kaefer.list() : null;
      if (TK)
        for (const kt of TK) {
          if (!Number.isFinite(kt.x) || kt.stage < 1) continue;
          const q = pr(kt.x, kt.y, 0.5);
          if (on(q))
            h += dot(
              q,
              r + 0.6,
              'nat',
              kt.stage === 1 ? '#e0312b' : kt.stage === 2 ? '#8b3a1c' : '#8c8c8c',
              kt.stage === 1
                ? `Borkenkäfer: Bohrmehl – noch ${kt.ausflugIn} Tage bis zum Ausflug`
                : kt.stage === 2
                  ? 'Käferfichte, rotbraun'
                  : 'Käferfichte, tot'
            );
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
      // feat/tiere: their beetle trees with bore dust, once the forest was walked
      const TK = window.TIERE && TIERE.kaefer && typeof TIERE.kaefer.list === 'function' ? TIERE.kaefer.list() : null;
      if (TK && STRAT.known('wald', 'klinge') && TK.some(kt => kt.stage === 1))
        L.push(['klinge', 'Borkenkäfer: ' + TK.filter(kt => kt.stage === 1).length + ' Fichten mit Bohrmehl']);
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
  // ---- traffic: every vehicle of the streets (verkehr/*) in its real size and paint, its trailer behind it; far up a little
  //      bigger than true, so it stays to be seen (feat/verkehr-real: Falko 13.11. „natürlich muss man den Verkehr auch von oben sehen
  //      können“) ----
  const CLS = { pkw: 'Pkw', lfz: 'Transporter', lkw: 'Lkw', trak: 'Traktor', zug: 'Anhänger' };
  function shape(b, D, col, title, pr, W, H, lorry) {
    const cx = b.x + Math.sin(b.hd) * D.CY,
      cy = b.y + Math.cos(b.hd) * D.CY,
      q = pr(cx, cy, 0.8);
    if (q[2] >= 1 || q[0] < -30 || q[1] < -30 || q[0] > W + 30 || q[1] > H + 30) return '';
    const f = [Math.sin(b.hd), Math.cos(b.hd)],
      r = [Math.cos(b.hd), -Math.sin(b.hd)],
      tip = pr(cx + f[0] * D.HL, cy + f[1] * D.HL, 0.8),
      side = pr(cx + r[0] * D.HW, cy + r[1] * D.HW, 0.8),
      // the screen's half length and half width of the vehicle; at least 5 × 2.4 px
      ul = [tip[0] - q[0], tip[1] - q[1]],
      ll = Math.hypot(ul[0], ul[1]) || 1e-6,
      uw = [side[0] - q[0], side[1] - q[1]],
      lw = Math.hypot(uw[0], uw[1]) || 1e-6,
      k = Math.max(1, 5 / ll),
      kw = Math.max(k, 2.4 / lw),
      P4 = [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ].map(([a, s]) => [q[0] + ul[0] * k * a + uw[0] * kw * s, q[1] + ul[1] * k * a + uw[1] * kw * s]),
      pts = P4.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');
    let h = `<polygon points="${pts}" fill="${col}" stroke="#1b1d20" stroke-width="1" stroke-linejoin="round"><title>${title}</title></polygon>`;
    // the front: the cab of a lorry darker, the windscreen of a car as a short line
    if (ll * k > 7) {
      const t = lorry ? 0.62 : 0.3,
        a0 = [q[0] + ul[0] * k * t, q[1] + ul[1] * k * t];
      h += `<line x1="${f1(a0[0] + uw[0] * kw * 0.8)}" y1="${f1(a0[1] + uw[1] * kw * 0.8)}" x2="${f1(a0[0] - uw[0] * kw * 0.8)}" y2="${f1(a0[1] - uw[1] * kw * 0.8)}" stroke="#1b1d20" stroke-opacity=".7" stroke-width="${lorry ? 1.4 : 1}"/>`;
    }
    return h;
  }
  STRAT.layer.define({
    id: 'verkehr',
    draw: (pr, W, H) => {
      if (P.th > 2500) return '';
      let h = '';
      for (const c of VAUTO.cars || []) {
        if (!Number.isFinite(c.x) || c.st === 'weg' || c.st === 'geliehen') continue;
        const D = c.D || (VAUTO.dimsOf && VAUTO.dimsOf(null)),
          T = c.vm && c.vm.T,
          col = (c.paint && c.paint.col) || c.col || '#cfd6de',
          name = T ? T.name : 'Pkw',
          lorry = !!T && (T.cls === 'lkw' || T.cls === 'trak');
        if (!D) continue;
        const t = c.trailer;
        if (t && t.init) h += shape(t, t.D, (c.paint && c.paint.col2) || '#e8e8e4', CLS.zug, pr, W, H, false);
        h += shape(c, D, col, name, pr, W, H, lorry);
        // feat/verkehr-real stage 3: after a knock, a warning triangle beside it while its hazard lights blink
        if (c.crash && c.blink === 2) {
          const q = pr(c.x, c.y, 1.2);
          if (q[2] < 1 && q[0] > -20 && q[1] > -20 && q[0] < W + 20 && q[1] < H + 20)
            h += `<path d="M${f1(q[0] + 10)} ${f1(q[1] - 16)} l7 12 h-14 z" fill="#ffd21a" stroke="#d01c14" stroke-width="2.2" stroke-linejoin="round"><title>Unfall – Warnblinker an</title></path>`;
        }
      }
      // feat/bus: its buses when it is there (BUS.state().inst → [{ x, y, line }])
      const B = window.BUS;
      if (B && (typeof B.list === 'function' || typeof B.state === 'function'))
        try {
          const list = typeof B.list === 'function' ? B.list() : B.state().inst;
          for (const b of list || []) {
            const q = pr(b.x, b.y, 1.5);
            if (q[2] >= 1 || q[0] < -20 || q[1] < -20 || q[0] > W + 20 || q[1] > H + 20) continue;
            h += `<rect x="${f1(q[0] - 4)}" y="${f1(q[1] - 10)}" width="8" height="20" rx="2" fill="#f2c500" stroke="#222" stroke-width="1"><title>${('Bus ' + (b.line || '') + (b.head ? ' → ' + b.head : '')).replace(/[<&]/g, '')}</title></rect>`;
            if (P.th < 700 && b.line)
              h += `<text x="${f1(q[0] + 7)}" y="${f1(q[1] + 3)}" style="fill:#fff3b0;font:600 10px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.7);stroke-width:3px">${String(b.line).replace(/[<&]/g, '')}</text>`;
          }
        } catch (e) {}
      // feat/verkehr-real stage 2b: the traffic lights in the colour their main road has now (a junction: the side road's as a ring)
      const A = window.VKAMPEL;
      if (A && A.dots && P.th < 1500) {
        const C = { gruen: '#35d46a', gelb: '#ffb21a', rot: '#ff3b2f', rotgelb: '#ff7a1a' },
          N = { gruen: 'grün', gelb: 'gelb', rot: 'rot', rotgelb: 'rot-gelb' };
        for (const d of A.dots()) {
          const q = pr(d.x, d.y, 3);
          if (q[2] >= 1 || q[0] < -20 || q[1] < -20 || q[0] > W + 20 || q[1] > H + 20) continue;
          const tip =
            d.kind === 'k'
              ? `Ampel – Hauptstraße ${N[d.a]}, Nebenstraße ${N[d.b]}`
              : `Fußgängerampel – Autos ${N[d.a]}`;
          if (d.kind === 'k')
            h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="8.5" fill="none" stroke="${C[d.b]}" stroke-width="2.5"/>`;
          h += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="5" fill="${C[d.a]}" stroke="#111" stroke-width="1.2"><title>${tip}</title></circle>`;
        }
      }
      return h;
    },
  });
  // ---- the weather as it is (feat/wetter live, else the climate): a veil for the clouds, rain over the map, the wind's arrow ----
  STRAT.layer.define({
    id: 'wetter',
    under: true, // beneath the symbols and labels
    draw: (pr, W, H) => {
      const wx = STRAT.W.wx(STRAT.W.CLOCK.t);
      if (!wx) return '';
      let h = '';
      if (wx.cloud > 0.5)
        h += `<rect x="0" y="0" width="${W}" height="${H}" fill="rgb(70,80,92)" fill-opacity="${((wx.cloud - 0.5) * 0.36).toFixed(2)}"/>`;
      if (wx.rain > 0.2)
        h += `<defs><pattern id="strain" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(${Math.min(35, wx.wind / 2).toFixed(0)})"><line x1="3" y1="0" x2="3" y2="${Math.min(12, 4 + wx.rain * 2).toFixed(0)}" stroke="rgb(205,220,240)" stroke-opacity=".3" stroke-width="1"/></pattern></defs><rect x="0" y="0" width="${W}" height="${H}" fill="url(#strain)"/>`;
      // the wind: an arrow where it blows to (the plan view has north up), its speed beside it
      const a = (((wx.dir ?? 250) + 180) % 360) * (Math.PI / 180),
        narrow = W <= 720, // phones: left, between the time box and the people strip; else bottom right above the scale
        cy = narrow ? Math.round(H * 0.42) : H - 135,
        L = 13,
        dx = Math.sin(a) * L,
        dy = -Math.cos(a) * L;
      let cx = narrow ? 34 : W - 46;
      // a place's panel open at the right over it: the arrow steps left of the panel
      const pn = !narrow && document.getElementById('stpan'),
        sv = pn && document.getElementById('stsvg');
      if (pn && sv) {
        const r = pn.getBoundingClientRect(),
          s = sv.getBoundingClientRect();
        if (r.width > 0 && r.bottom - s.top > cy - 22 && r.right - s.left > cx - 22)
          cx = Math.max(30, Math.round(r.left - s.left - 34));
      }
      h += `<g class="wind"><circle cx="${cx}" cy="${cy}" r="19" fill="rgba(24,28,22,.7)"/><line x1="${f1(cx - dx)}" y1="${f1(cy - dy)}" x2="${f1(cx + dx)}" y2="${f1(cy + dy)}" stroke="#e8f0ff" stroke-width="2"/><circle cx="${f1(cx + dx)}" cy="${f1(cy + dy)}" r="3" fill="#e8f0ff"/><text x="${cx}" y="${cy + 33}" text-anchor="middle" style="fill:#e8f0ff;font:600 10px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.7);stroke-width:3px">${Math.round(wx.wind)} km/h${wx.storm ? ' · Sturm' : ''}</text></g>`;
      return h;
    },
  });
  // ---- carriers on the ways (Settlers): a tractor with its loaded trailer on the field track while a skidding run is under way ----
  const TRK = new Map(); // job id → the last point and heading on the screen
  STRAT.layer.define({
    id: 'wege',
    draw: (pr, W, H) => {
      let h = '';
      for (const j of S.jobs) {
        const J = j.st === 'work' ? STRAT.job.get(j.def) : null;
        if (!J || !J.ride || !J.ride(j, j.who[0])) continue;
        const a = STRAT.pos(j.who[0]),
          b0 = STRAT.place.pos('klinge'),
          q = pr(a[0], a[1], 1.5);
        if (q[2] >= 1 || q[0] < -30 || q[1] < -30 || q[0] > W + 30 || q[1] > H + 30) continue;
        // the heading on the screen: towards the yard along the way (a point a little ahead)
        let L = TRK.get(j.id);
        if (!L) TRK.set(j.id, (L = { x: b0 ? b0[0] : a[0], y: b0 ? b0[1] : a[1], ang: 0 }));
        const p0 = pr(L.x, L.y, 1.5);
        let ang = Math.atan2(q[1] - p0[1], q[0] - p0[0]);
        if (Math.hypot(q[0] - p0[0], q[1] - p0[1]) < 0.5) ang = L.ang;
        if (Math.hypot(a[0] - L.x, a[1] - L.y) > 4) {
          L.x = a[0];
          L.y = a[1];
        }
        L.ang = ang;
        const deg = ((ang * 180) / Math.PI).toFixed(0),
          fmv = (j.d.ids || []).reduce((s2, id) => {
            const l = window.HOLZ && HOLZ.by[id];
            return s2 + (l ? l.vol || 0 : 0);
          }, 0);
        h += `<g class="trk" transform="translate(${f1(q[0])} ${f1(q[1])}) rotate(${deg}) scale(1.5)"><rect x="-22" y="-4" width="13" height="8" rx="1.5" fill="#8a6a44" stroke="#222" stroke-width="1"/><line x1="-9" y1="0" x2="-5" y2="0" stroke="#222" stroke-width="1.5"/><rect x="-5" y="-5" width="11" height="10" rx="2" fill="#2f7a3a" stroke="#222" stroke-width="1"/><rect x="2" y="-3.5" width="5" height="7" rx="1" fill="#cfe0d2" stroke="#222" stroke-width=".8"/></g>`;
        h += `<text x="${f1(q[0] + 24)}" y="${f1(q[1] - 10)}" style="fill:#f3e2b8;font:600 10.5px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.7);stroke-width:3px">Traktor · ${fmv.toLocaleString('de-DE', { maximumFractionDigits: 1 })} fm</text>`;
      }
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
