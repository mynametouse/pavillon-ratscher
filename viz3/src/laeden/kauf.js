// ===================== feat/laeden-leben 7: really shopping – take from the shelf, pay at the till, the counter, the receipt (LKAUF) =====================
// Falko (17.11.2026): „Man soll dort wirklich einkaufen können.“ In an open shop every block of goods on a shelf is a product
// (einkauf/waren.js: by the department its colours come from and its kind of package): standing in front of it the action button says
// „Nehmen: Frische Vollmilch 1 l · 1,19 €“ (E / tap) and it goes into the basket (the chip at the top shows what is in it and what it
// costs). At an open till – one with its cashier (laeden/leben.js) – „An Kasse 2 bezahlen“: the cashier scans thing by thing (the
// scanner beeps), says the sum, one pays from the wallet (GELD; in the Grenzland mode the mode's money), gets the receipt and the things
// go into the inventory (INVENTAR). At the bakery's counter one orders from the baker. Going out with an unpaid basket: the things stay
// in the shop (they are put back). Events: KERN 'einkauf' { laden, posten, summe }, 'einkauf:korb' { id, n }.
//   LKAUF.korb() → [{ id, n, preis }] · summe() · nimm(id, n) · zurueck() · bezahlen(kasse?) → beleg | null · best() (tests)
//   LKAUF.theke(id) (the bakery's choice) · LKAUF.status()
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { toast, audio } from '../audio/audio.js';
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { WAREN } from '../einkauf/waren.js';
import { GELD } from '../einkauf/geld.js';
import { INVENTAR } from '../einkauf/inventar.js';
import { LIMARKT } from './innen_markt.js';
import { LIBAU } from './innen_bau.js';
import { LINNEN } from './innen.js';
import { LLEBEN } from './leben.js';
export const LKAUF = (() => {
  const S = { on: false, items: [], best: null, unit: null, busy: false, last: null, err: '' };
  if (!LINNEN.on) return S;
  S.on = true;
  const CAT = WAREN.farbenKarte(LIMARKT, LIBAU);
  // ---- the goods of the unit the walker is in: a hash of 2 m cells, built on going in ----
  const IDX = new Map();
  function index(M, u) {
    const key = M.sh.id + ':' + u.U.id;
    if (IDX.has(key)) return IDX.get(key);
    const H = new Map();
    (u.goods || []).forEach((g, i) => {
      if (!g.front && g.k !== 'heap') return;
      const cat = CAT.get(g.col) || null,
        id = WAREN.fuer(cat, g.k, i * 7 + Math.round(g.x * 3));
      if (!id) return;
      const e = {
        id,
        x: g.x + (g.front ? g.fx * (g.dep / 2) : 0),
        y: g.y + (g.front ? g.fy * (g.dep / 2) : 0),
        z: g.z + g.h * 0.5,
        fx: g.front ? g.fx : 0,
        fy: g.front ? g.fy : 0,
      };
      const ck = Math.floor(e.x / 2) + ',' + Math.floor(e.y / 2);
      if (!H.has(ck)) H.set(ck, []);
      H.get(ck).push(e);
    });
    const I = { H, n: [...H.values()].reduce((a, b) => a + b.length, 0) };
    IDX.set(key, I);
    if (IDX.size > 6) IDX.delete(IDX.keys().next().value);
    return I;
  }
  // the block in front of the walker: within 1.25 m of its front, in the way he looks, at a height he reaches
  function find() {
    const ua = LINNEN.where(P.x, P.y);
    if (!ua || P.mode !== 'walk' || !LINNEN.openU(ua.U)) return null;
    const u = ua.M.units.find(q => q.U === ua.U);
    if (!u) return null;
    const I = index(ua.M, u),
      y = (P.yaw * Math.PI) / 180,
      fx = Math.sin(y),
      fy = Math.cos(y),
      zf = ua.M.zf(P.x, P.y);
    let best = null,
      bs = 1e9;
    const ci = Math.floor(P.x / 2),
      cj = Math.floor(P.y / 2);
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++)
        for (const e of I.H.get(i + ',' + j) || []) {
          const dx = e.x - P.x,
            dy = e.y - P.y,
            d = Math.hypot(dx, dy);
          if (d > 1.25 || e.z > 2.0) continue;
          // the front faces the walker, the walker faces it
          if (e.fx || e.fy) if (dx * e.fx + dy * e.fy > 0.05) continue;
          const cs = (dx * fx + dy * fy) / (d || 1);
          if (cs < 0.45) continue;
          const sc = d + (1 - cs) * 1.5 + Math.abs(e.z - 1.1) * 0.25;
          if (sc < bs) {
            bs = sc;
            best = e;
          }
        }
    if (!best) return null;
    return { ...best, zf, unit: ua.U, M: ua.M };
  }
  // ---- the basket ----
  const summe = () => S.items.reduce((a, q) => a + q.preis * q.n, 0);
  const count = () => S.items.reduce((a, q) => a + q.n, 0);
  function nimm(id, n = 1) {
    const w = WAREN.get(id);
    if (!w) return false;
    const q = S.items.find(x => x.id === id);
    if (q) q.n += n;
    else S.items.push({ id, n, preis: w.preis });
    KERN.emit('einkauf:korb', { id, n: (q ? q.n : n) | 0 });
    chip();
    return true;
  }
  function zurueck(quiet) {
    if (!S.items.length) return 0;
    const n = count();
    S.items = [];
    chip();
    if (!quiet) toast('Die Ware bleibt im Laden – bezahlt wird an der Kasse.', 4200);
    return n;
  }
  // ---- sounds: the scanner's beep, the till's drawer ----
  function beep(f = 2650, d = 0.075, v = 0.18) {
    try {
      const r = audio.raw && audio.raw();
      if (!r || !r.ctx || !r.sfx) return;
      const t = r.ctx.currentTime,
        o = r.ctx.createOscillator(),
        g = r.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.setValueAtTime(v, t + d - 0.01);
      g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g);
      g.connect(r.sfx);
      o.start(t);
      o.stop(t + d + 0.02);
    } catch (e) {}
  }
  // ---- the panel at the till and at the counter ----
  let css = null,
    panel = null,
    chipEl = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function style() {
    if (css || typeof document === 'undefined') return;
    css = document.createElement('style');
    css.textContent =
      '#kassepanel{position:absolute;z-index:6;top:60px;left:max(12px,env(safe-area-inset-left,0px));width:min(360px,calc(100% - 24px));max-height:calc(100% - 150px);overflow:auto;background:var(--paper,#fbf8f2);color:var(--ink,#222);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:400 13.5px/1.45 var(--f-body,sans-serif)}' +
      '#kassepanel[hidden]{display:none}' +
      '#kassepanel h3{display:flex;justify-content:space-between;align-items:center;margin:0;padding:12px 14px 6px;font:700 16px/1.2 var(--f-display,sans-serif)}' +
      '#kassepanel h3 button{border:0;background:transparent;color:var(--muted,#777);font:400 22px/1 var(--f-body,sans-serif);cursor:pointer}' +
      '#kassepanel .say{padding:4px 14px 8px;font-style:italic}' +
      '#kassepanel .bon{margin:0 14px 8px;padding:8px 10px;font:400 12px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#fffdf7;border:1px dashed #c9b896;border-radius:4px;white-space:pre}' +
      '#kassepanel .wahl{display:flex;flex-direction:column;gap:4px;padding:0 14px 8px}' +
      '#kassepanel .wahl div{display:flex;align-items:center;gap:8px}' +
      '#kassepanel .wahl span{flex:1}' +
      '#kassepanel .wahl img{width:26px;height:26px}' +
      '#kassepanel .btns{display:flex;flex-wrap:wrap;gap:6px;padding:4px 14px 14px}' +
      '#kassepanel button.b{border:1px solid var(--line,#d8d0c0);background:var(--plate,#efe9dd);color:var(--ink,#222);border-radius:999px;font:500 13px/1.25 var(--f-body,sans-serif);padding:9px 12px;cursor:pointer}' +
      '#kassepanel button.b.main{border-color:var(--accent,#9b6a2f);font-weight:700}' +
      '#korbchip{position:absolute;z-index:4;top:12px;left:50%;transform:translateX(-50%);background:rgba(20,22,26,.66);color:#fff;border-radius:16px;padding:6px 12px;font:600 13px/1.2 var(--f-body,sans-serif);pointer-events:none;white-space:nowrap}' +
      '#korbchip[hidden]{display:none}';
    document.head.appendChild(css);
  }
  function chip() {
    if (typeof document === 'undefined') return;
    style();
    if (!chipEl) {
      chipEl = document.createElement('div');
      chipEl.id = 'korbchip';
      chipEl.hidden = true;
      (document.getElementById('stage') || document.body).appendChild(chipEl);
    }
    const n = count();
    chipEl.hidden = !n;
    if (n) chipEl.textContent = 'Im Korb: ' + n + (n === 1 ? ' Artikel' : ' Artikel') + ' · ' + WAREN.euro(summe());
  }
  function show(h, wire) {
    style();
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'kassepanel';
      panel.setAttribute('aria-label', 'Kasse');
      (document.getElementById('stage') || document.body).appendChild(panel);
    }
    panel.innerHTML = h;
    panel.hidden = false;
    const x = panel.querySelector('h3 button');
    if (x) x.onclick = close;
    if (wire) wire(panel);
  }
  function close() {
    if (panel) panel.hidden = true;
    if (S.till) {
      S.till.K.walker = false;
      S.till = null;
    }
  }
  const bonText = (laden, posten, sum, given) => {
    const W = 34,
      line = (l, r) => {
        const s = l.slice(0, W - r.length - 1);
        return s + ' '.repeat(Math.max(1, W - s.length - r.length)) + r;
      };
    const out = [laden, CLOCK.fmt ? CLOCK.fmt(CLOCK.t) : '', '-'.repeat(W)];
    for (const [id, n, c] of posten) {
      const w = WAREN.get(id);
      out.push(line((n > 1 ? n + ' × ' : '') + (w ? w.name : id), WAREN.euro(c * n)));
    }
    out.push('-'.repeat(W), line('SUMME', WAREN.euro(sum)));
    if (given) out.push(line('Gegeben', WAREN.euro(given)), line('Zurück', WAREN.euro(given - sum)));
    return out.join('\n');
  };
  // a note one hands over (the next round sum: 5, 10, 20, 50, 100 €)
  const note = c => [500, 1000, 2000, 5000, 10000, 20000].find(n => n >= c) || Math.ceil(c / 100) * 100;
  // ---- paying at a till: the cashier scans thing by thing, says the sum, one pays ----
  function bezahlen(T) {
    const at = T || LLEBEN.kasseAt(P.x, P.y);
    if (!at || !S.items.length || S.busy) return null;
    const { R, K } = at,
      laden = R.U.name || 'Laden',
      posten = S.items.map(q => [q.id, q.n, q.preis]),
      sum = summe();
    S.busy = true;
    S.till = at;
    K.walker = true;
    const n = count();
    let i = 0;
    const who = K.staff ? (LLEBEN.FIGS[K.staff.fi].c === 'f' ? 'Die Kassiererin' : 'Der Kassierer') : 'An der Kasse';
    show(
      '<h3>' +
        esc(laden) +
        ' · Kasse ' +
        (K.i || '') +
        '<button type="button" aria-label="Schließen">×</button></h3><div class="say">' +
        esc(who) +
        ' zieht die Ware über den Scanner …</div>'
    );
    const scan = () => {
      if (i < Math.min(n, 30)) {
        beep();
        i++;
        S.scanT = setTimeout(scan, 420);
        return;
      }
      const geld = GELD.stand(),
        ok = geld >= sum,
        given = ok ? Math.min(geld, note(sum)) : 0;
      show(
        '<h3>' +
          esc(laden) +
          ' · Kasse ' +
          (K.i || '') +
          '<button type="button" aria-label="Schließen">×</button></h3><div class="say">„Das macht dann ' +
          esc(WAREN.euro(sum)) +
          '.“</div><div class="bon">' +
          esc(bonText(laden, posten, sum)) +
          '</div><div class="btns">' +
          (ok
            ? '<button type="button" class="b main" data-k="bar">Bar bezahlen</button><button type="button" class="b" data-k="karte">Mit Karte</button>'
            : '<button type="button" class="b" data-k="weg">Das reicht nicht – Ware zurücklegen</button>') +
          '</div><div class="say">In der Geldbörse: ' +
          esc(GELD.text()) +
          '</div>',
        p => {
          for (const b of p.querySelectorAll('button[data-k]'))
            b.onclick = () => {
              const k = b.dataset.k;
              if (k === 'weg') {
                zurueck(true);
                S.busy = false;
                close();
                toast('Die Ware bleibt an der Kasse liegen.', 3000);
                return;
              }
              done(at, laden, posten, sum, k === 'bar' ? given : 0);
            };
        }
      );
    };
    scan();
    return { laden, posten, summe: sum };
  }
  function done(at, laden, posten, sum, given) {
    if (!GELD.zahlen(sum, 'Einkauf ' + laden)) {
      toast('Das Geld reicht nicht.', 3000);
      S.busy = false;
      return;
    }
    beep(1400, 0.12, 0.12);
    for (const [id, n] of posten) INVENTAR.add(id, n);
    const b = { laden, posten, summe: sum, t: CLOCK.t };
    INVENTAR.bon(b);
    S.last = b;
    S.items = [];
    chip();
    KERN.emit('einkauf', { laden, unit: at.R.U.id, posten, summe: sum });
    show(
      '<h3>' +
        esc(laden) +
        '<button type="button" aria-label="Schließen">×</button></h3><div class="say">„Danke schön, einen schönen Tag noch!“</div><div class="bon">' +
        esc(bonText(laden, posten, sum, given)) +
        '</div><div class="btns"><button type="button" class="b main" data-k="ok">Einpacken</button><button type="button" class="b" data-k="inv">Einkäufe ansehen</button></div>',
      p => {
        p.querySelector('[data-k=ok]').onclick = close;
        p.querySelector('[data-k=inv]').onclick = () => {
          close();
          INVENTAR.zeigen(true);
        };
      }
    );
    S.busy = false;
    markDirty();
  }
  // ---- the bakery's counter: what the baker has (the counter's goods) ----
  const THEKE = ['broetchen', 'brot', 'pfannkuchen', 'streusel', 'kaffee_becher'];
  function theke(at) {
    const T = at || LLEBEN.kasseAt(P.x, P.y);
    if (!T || !T.theke || S.busy) return false;
    const laden = T.R.U.name || 'Bäckerei',
      want = new Map();
    S.till = { K: T.K, R: T.R };
    T.K.walker = true;
    const draw = () => {
      let sum = 0;
      for (const [id, n] of want) sum += WAREN.get(id).preis * n;
      show(
        '<h3>' +
          esc(laden) +
          '<button type="button" aria-label="Schließen">×</button></h3><div class="say">„Guten Tag! Was darf’s sein?“</div><div class="wahl">' +
          THEKE.map(id => {
            const w = WAREN.get(id);
            return (
              '<div><img alt="" src="' +
              INVENTAR.bild(id) +
              '"><span>' +
              esc(w.name) +
              ' · ' +
              esc(WAREN.euro(w.preis)) +
              '</span><b>' +
              (want.get(id) || 0) +
              '</b><button type="button" class="b" data-add="' +
              id +
              '">+</button></div>'
            );
          }).join('') +
          '</div><div class="btns"><button type="button" class="b main" data-k="pay"' +
          (sum ? '' : ' disabled') +
          '>Bezahlen · ' +
          esc(WAREN.euro(sum)) +
          '</button><button type="button" class="b" data-k="no">Nichts, danke</button></div><div class="say">In der Geldbörse: ' +
          esc(GELD.text()) +
          '</div>',
        p => {
          for (const b of p.querySelectorAll('[data-add]'))
            b.onclick = () => {
              want.set(b.dataset.add, (want.get(b.dataset.add) || 0) + 1);
              draw();
            };
          p.querySelector('[data-k=no]').onclick = close;
          p.querySelector('[data-k=pay]').onclick = () => {
            const posten = [...want].filter(([, n]) => n > 0).map(([id, n]) => [id, n, WAREN.get(id).preis]);
            if (!posten.length) return;
            const s2 = posten.reduce((a, [, n, c]) => a + n * c, 0);
            if (GELD.stand() < s2) {
              toast('Das Geld reicht nicht.', 3000);
              return;
            }
            done({ R: T.R, K: T.K }, laden, posten, s2, 0);
          };
        }
      );
    };
    draw();
    return true;
  }
  // ---- the action button ----
  let acc = 0,
    wasIn = null;
  KERN.tick(dt => {
    acc += dt;
    if (acc < 0.2) return;
    acc = 0;
    try {
      S.best = find();
      const ua = LINNEN.where(P.x, P.y),
        inShop = !!ua;
      INVENTAR.imLaden(inShop || S.items.length > 0);
      // out of the shop with an unpaid basket: the things stay inside
      if (wasIn && !inShop && S.items.length && !S.busy) zurueck(false);
      if (!inShop && panel && !panel.hidden && !S.busy) close();
      wasIn = inShop ? ua.U.id : null;
      S.unit = wasIn;
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
    }
  }, 'laeden-kauf');
  KERN.act({
    id: 'laeden:nehmen',
    r: 1.6,
    prio: 0.4,
    pos: () => (S.best ? [S.best.x, S.best.y, S.best.zf + Math.min(1.6, S.best.z)] : null),
    label: () => {
      if (!S.best || S.busy) return null;
      const w = WAREN.get(S.best.id);
      return w ? 'Nehmen: ' + w.name + ' · ' + WAREN.euro(w.preis) : null;
    },
    run: () => {
      if (!S.best) return;
      const w = WAREN.get(S.best.id);
      if (nimm(S.best.id, 1)) {
        toast('In den Korb: ' + w.name + ' (' + WAREN.euro(w.preis) + ')', 2200);
        beep(900, 0.04, 0.06);
      }
    },
  });
  KERN.act({
    id: 'laeden:kasse',
    r: 1.4,
    prio: 1.2,
    pos: () => {
      const at = LLEBEN.kasseAt(P.x, P.y, 1.3);
      if (!at || at.theke) return null;
      return [at.K.z.x, at.K.z.y, (LINNEN.where(P.x, P.y) ? LINNEN.where(P.x, P.y).M.zf(P.x, P.y) : P.feet) + 1.0];
    },
    label: () => {
      const at = LLEBEN.kasseAt(P.x, P.y, 1.3);
      if (!at || at.theke || S.busy) return null;
      if (!at.K.open || !at.K.staff) return 'Kasse ' + at.K.i + ' – geschlossen';
      if (!S.items.length) return 'Kasse ' + at.K.i + ' – erst Ware in den Korb nehmen';
      return 'An Kasse ' + at.K.i + ' bezahlen · ' + WAREN.euro(summe());
    },
    run: () => {
      const at = LLEBEN.kasseAt(P.x, P.y, 1.3);
      if (!at || at.theke) return;
      if (!at.K.open || !at.K.staff) {
        toast('Diese Kasse ist nicht besetzt – eine andere ist offen.', 3000);
        return;
      }
      if (!S.items.length) {
        toast('Erst etwas aus den Regalen nehmen (vor der Ware: E).', 3000);
        return;
      }
      bezahlen(at);
    },
  });
  KERN.act({
    id: 'laeden:theke',
    r: 1.5,
    prio: 1.2,
    pos: () => {
      const at = LLEBEN.kasseAt(P.x, P.y, 1.4);
      if (!at || !at.theke) return null;
      return [at.K.k.x, at.K.k.y, (LINNEN.where(P.x, P.y) ? LINNEN.where(P.x, P.y).M.zf(P.x, P.y) : P.feet) + 1.0];
    },
    label: () => {
      const at = LLEBEN.kasseAt(P.x, P.y, 1.4);
      if (!at || !at.theke || S.busy) return null;
      return at.K.staff ? 'An der Theke bestellen' : 'Die Theke ist gerade nicht besetzt';
    },
    run: () => {
      const at = LLEBEN.kasseAt(P.x, P.y, 1.4);
      if (at && at.theke && at.K.staff) theke(at);
      else toast('Gerade bedient hier niemand.', 2500);
    },
  });
  Object.assign(S, {
    korb: () => S.items.map(q => ({ ...q })),
    summe,
    nimm,
    zurueck,
    bezahlen,
    theke,
    close,
    find,
    status: () => ({
      on: S.on,
      unit: S.unit,
      best: S.best ? { id: S.best.id, x: +S.best.x.toFixed(2), y: +S.best.y.toFixed(2) } : null,
      korb: S.items.length,
      summe: summe(),
      busy: S.busy,
      idx: [...IDX.entries()].map(([k, v]) => [k, v.n]),
      err: S.err,
    }),
  });
  return S;
})();
window.LKAUF = LKAUF;
