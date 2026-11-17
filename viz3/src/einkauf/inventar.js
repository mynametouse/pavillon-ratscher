// ===================== feat/laeden-leben 4: what one has bought (INVENTAR), the panel „Einkäufe“, the clock for OEFFNUNG =====================
// Falko (17.11.2026): „Inventarisierung von Dingen“. Bought things (einkauf/waren.js: name, picture, weight) are kept by count, saved
// ('pav-inventar-v1'); in the Grenzland mode they are the mode's small things (GL.inv through GL.add / GL.has / GL.use – a mission
// asks GL.has('brecheisen') the same way), so a crowbar bought in OBI during the mode is the mode's crowbar. The panel shows the wallet
// (GELD), the things with picture, count and weight, the last receipts; it opens from the purse button at the top right (shown in a shop
// or once one has something), and as a part of the inventory window (I).
//   INVENTAR.add(id, n) · has(id, n) → bool · take(id, n) → bool · anzahl(id) · list() → [{ id, n, name, kg, bild }] · gewicht() → kg
//   INVENTAR.bon(beleg) (a receipt: { laden, posten: [[id, n, cent]], summe, t }) · bons() · zeigen(on?) · bild(id) → data URL
//   events KERN 'inventar' { id, n, d }
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { CLOCK } from '../time/clock.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { OEFFNUNG } from './oeffnung.js';
import { WAREN } from './waren.js';
import { GELD } from './geld.js';
export const INVENTAR = (() => {
  // the opening hours read the game's calendar from here on
  OEFFNUNG.uhr(DCAL, () => CLOCK.t);
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const KEY = SAVE.key('pav-inventar-v1', {
    owner: 'einkauf',
    kind: 'json',
    def: null,
    check: v => v === null || (obj(v) && v.v === 1),
  });
  const S = { inv: {}, bonList: [], open: false };
  {
    const s = SAVE.get(KEY);
    if (s && obj(s.inv))
      for (const [k, n] of Object.entries(s.inv))
        if (typeof k === 'string' && k.length < 40 && Number.isFinite(n) && n > 0 && k !== '__proto__')
          S.inv[k] = Math.min(9999, Math.round(n));
    if (s && Array.isArray(s.bons)) S.bonList = s.bons.filter(b => obj(b) && Array.isArray(b.posten)).slice(-5);
  }
  const save = () => SAVE.set(KEY, { v: 1, inv: S.inv, bons: S.bonList.slice(-5) });
  const gl = () => {
    const G = window.GLSTATE;
    return G && G.on && typeof G.add === 'function' ? G : null;
  };
  const store = () => {
    const G = gl();
    return G ? G.inv || {} : S.inv;
  };
  function add(id, n = 1) {
    n = Math.round(n);
    if (!id || !(n > 0)) return 0;
    const G = gl();
    let now;
    if (G) now = G.add(id, n);
    else {
      S.inv[id] = (S.inv[id] || 0) + n;
      now = S.inv[id];
      save();
    }
    KERN.emit('inventar', { id, n: now, d: n });
    refresh();
    return now;
  }
  const anzahl = id => store()[id] || 0;
  const has = (id, n = 1) => anzahl(id) >= n;
  function take(id, n = 1) {
    if (!has(id, n)) return false;
    const G = gl();
    if (G) G.use(id, n);
    else {
      S.inv[id] -= n;
      if (S.inv[id] <= 0) delete S.inv[id];
      save();
    }
    KERN.emit('inventar', { id, n: anzahl(id), d: -n });
    refresh();
    return true;
  }
  function list() {
    return Object.entries(store())
      .filter(([, n]) => n > 0)
      .map(([id, n]) => {
        const w = WAREN.get(id);
        return { id, n, name: w ? w.name : id, kg: w ? w.kg : 0, bild: bild(id) };
      });
  }
  const gewicht = () => list().reduce((a, q) => a + q.kg * q.n, 0);
  function bon(b) {
    if (!obj(b) || !Array.isArray(b.posten)) return;
    S.bonList.push({
      laden: String(b.laden || ''),
      posten: b.posten.slice(0, 40),
      summe: b.summe | 0,
      t: b.t || CLOCK.t,
    });
    if (S.bonList.length > 5) S.bonList.shift();
    save();
    refresh();
  }
  // ---- pictures: a small drawing of the package in its department's colour (no brand, no label but a plain band) ----
  const COL = {
    kaffee: '#6b4226',
    fruehstueck: '#d9a531',
    konserven: '#b9bcc2',
    nudeln: '#e6c34d',
    gewuerze: '#8d9b45',
    suess: '#c9506f',
    knabber: '#e2b738',
    backen: '#ece6d6',
    drogerie: '#8fb7d2',
    haushalt: '#4f8cc9',
    tier: '#a8743f',
    wein: '#5a1f2a',
    wasser: '#8cc3e0',
    milch: '#f3f3f3',
    kaese: '#f0c75a',
    wurst: '#c0504d',
    tk: '#5b8fd8',
    obst: '#c8371f',
    gemuese: '#4f8a2f',
    brot: '#b98048',
    pflanzen: '#3f7a2c',
    werkzeug: '#b52a1f',
    farben: '#e8e8e4',
    elektro: '#3c6fb0',
    sanitaer: '#c5ccd2',
    eisenwaren: '#8e939a',
    leuchten: '#e3d9b8',
    haushaltobi: '#4f8cc9',
    garten: '#4c7a33',
    boden: '#a98b61',
    fliesen: '#cfc8bb',
    baustoffe: '#bdbab3',
    holz: '#d2b07a',
  };
  const PICS = new Map();
  function bild(id) {
    if (PICS.has(id)) return PICS.get(id);
    const w = WAREN.get(id),
      art = w ? w.art : 'box',
      c = (w && COL[w.cat]) || '#9a8f80';
    let url = '';
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 48;
      const q = cv.getContext('2d');
      q.fillStyle = c;
      q.strokeStyle = 'rgba(0,0,0,.45)';
      q.lineWidth = 1.5;
      const band = (x, y, ww, h) => {
        q.fillStyle = 'rgba(255,255,255,.75)';
        q.fillRect(x, y, ww, h);
        q.fillStyle = c;
      };
      q.beginPath();
      if (art === 'bottle') {
        q.moveTo(19, 44);
        q.lineTo(19, 20);
        q.quadraticCurveTo(19, 15, 22, 13);
        q.lineTo(22, 5);
        q.lineTo(26, 5);
        q.lineTo(26, 13);
        q.quadraticCurveTo(29, 15, 29, 20);
        q.lineTo(29, 44);
        q.closePath();
        q.fill();
        q.stroke();
        band(19, 26, 10, 8);
      } else if (art === 'can' || art === 'jar') {
        q.rect(14, art === 'jar' ? 14 : 10, 20, art === 'jar' ? 30 : 34);
        q.fill();
        q.stroke();
        if (art === 'jar') {
          q.fillStyle = '#555';
          q.fillRect(14, 9, 20, 5);
        }
        band(14, 22, 20, 10);
      } else if (art === 'bag') {
        q.moveTo(12, 44);
        q.lineTo(14, 10);
        q.lineTo(34, 10);
        q.lineTo(36, 44);
        q.closePath();
        q.fill();
        q.stroke();
        band(15, 22, 18, 9);
      } else if (art === 'heap') {
        for (const [x, y, r] of [
          [16, 34, 9],
          [31, 34, 9],
          [24, 22, 9],
        ]) {
          q.beginPath();
          q.arc(x, y, r, 0, Math.PI * 2);
          q.fill();
          q.stroke();
        }
      } else if (art === 'loaf') {
        q.ellipse(24, 30, 18, 11, 0, Math.PI, 0);
        q.lineTo(42, 36);
        q.lineTo(6, 36);
        q.closePath();
        q.fill();
        q.stroke();
      } else if (art === 'crate') {
        q.rect(6, 16, 36, 26);
        q.fill();
        q.stroke();
        q.fillStyle = '#eee';
        for (let i = 0; i < 4; i++) q.fillRect(10 + i * 8, 10, 5, 6);
      } else if (art === 'eimer') {
        q.moveTo(11, 12);
        q.lineTo(37, 12);
        q.lineTo(34, 44);
        q.lineTo(14, 44);
        q.closePath();
        q.fill();
        q.stroke();
        band(13, 22, 22, 9);
      } else if (art === 'pack') {
        q.rect(6, 14, 36, 28);
        q.fill();
        q.stroke();
        band(6, 24, 36, 7);
      } else {
        q.rect(12, 8, 24, 36);
        q.fill();
        q.stroke();
        band(12, 20, 24, 10);
      }
      url = cv.toDataURL();
    } catch (e) {
      url = '';
    }
    PICS.set(id, url);
    return url;
  }
  // ---- the panel ----
  let css = null,
    panel = null,
    btn = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function style() {
    if (css) return;
    css = document.createElement('style');
    css.textContent =
      '#einkaufpanel{position:absolute;z-index:6;top:60px;right:max(12px,env(safe-area-inset-right,0px));width:min(360px,calc(100% - 24px));max-height:calc(100% - 140px);overflow:auto;background:var(--paper,#fbf8f2);color:var(--ink,#222);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:400 13.5px/1.45 var(--f-body,sans-serif)}' +
      '#einkaufpanel[hidden]{display:none}' +
      '#einkaufpanel h3{display:flex;justify-content:space-between;align-items:center;margin:0;padding:12px 14px 8px;font:700 16px/1.2 var(--f-display,sans-serif)}' +
      '#einkaufpanel h3 button{border:0;background:transparent;color:var(--muted,#777);font:400 22px/1 var(--f-body,sans-serif);cursor:pointer}' +
      '#einkaufpanel .geld{margin:0 14px 8px;padding:8px 10px;border-radius:8px;background:var(--plate,#efe9dd);display:flex;justify-content:space-between;font-weight:600}' +
      '#einkaufpanel ul{list-style:none;margin:0;padding:0 14px 8px}' +
      '#einkaufpanel li{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--line,#e2dccf)}' +
      '#einkaufpanel li img{width:28px;height:28px;flex:none}' +
      '#einkaufpanel li span{flex:1;min-width:0}' +
      '#einkaufpanel li small{color:var(--muted,#777)}' +
      '#einkaufpanel .leer{padding:4px 14px 10px;color:var(--muted,#777)}' +
      '#einkaufpanel h4{margin:8px 14px 4px;font:700 13px/1.3 var(--f-display,sans-serif)}' +
      '#einkaufpanel .bon{margin:0 14px 12px;padding:8px 10px;font:400 12px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#fffdf7;border:1px dashed #c9b896;border-radius:4px;white-space:pre}' +
      '#einkaufbtn{min-width:44px;height:36px;padding:0 10px;border-radius:18px;border:0;background:rgba(20,22,26,.62);color:#fff;font:600 13px/1 var(--f-body,sans-serif);cursor:pointer;margin-right:6px}' +
      '#einkaufbtn[hidden]{display:none}' +
      '#invwin .einkauf-inv{margin-top:10px;padding-top:8px;border-top:1px solid var(--line,#e2dccf)}' +
      '#invwin .einkauf-inv h4{margin:0 0 4px}' +
      '#invwin .einkauf-inv div{display:flex;align-items:center;gap:6px;font-size:12.5px}' +
      '#invwin .einkauf-inv img{width:22px;height:22px}';
    document.head.appendChild(css);
  }
  function bonText(b) {
    const W = 34,
      line = (l, r) => {
        const s = l.slice(0, W - r.length - 1);
        return s + ' '.repeat(Math.max(1, W - s.length - r.length)) + r;
      };
    const out = [b.laden, '-'.repeat(W)];
    for (const [id, n, c] of b.posten) {
      const w = WAREN.get(id);
      out.push(line((n > 1 ? n + ' × ' : '') + (w ? w.name : id), WAREN.euro(c * n)));
    }
    out.push('-'.repeat(W), line('SUMME', WAREN.euro(b.summe)));
    return out.join('\n');
  }
  function html() {
    const L = list(),
      kg = gewicht();
    let h =
      '<h3>Einkäufe<button type="button" aria-label="Schließen">×</button></h3><div class="geld"><span>Geldbörse</span><span>' +
      esc(GELD.text()) +
      '</span></div>';
    if (L.length)
      h +=
        '<ul>' +
        L.map(
          q =>
            '<li><img alt="" src="' +
            q.bild +
            '"><span>' +
            esc(q.name) +
            '</span><small>' +
            q.n +
            ' ×' +
            (q.kg ? ' · ' + (q.kg * q.n).toFixed(q.kg * q.n < 1 ? 2 : 1).replace('.', ',') + ' kg' : '') +
            '</small></li>'
        ).join('') +
        '</ul><div class="leer">Zusammen ' +
        kg.toFixed(1).replace('.', ',') +
        ' kg</div>';
    else
      h +=
        '<div class="leer">Noch nichts gekauft. In den Läden von Schleusingen: Ware nehmen (E), an der Kasse bezahlen.</div>';
    const b = S.bonList[S.bonList.length - 1];
    if (b) h += '<h4>Letzter Kassenbon</h4><div class="bon">' + esc(bonText(b)) + '</div>';
    return h;
  }
  function refresh() {
    if (typeof document === 'undefined') return;
    if (panel && !panel.hidden) {
      panel.innerHTML = html();
      panel.querySelector('h3 button').onclick = () => zeigen(false);
    }
    if (btn) {
      btn.textContent = GELD.text();
      btn.hidden = !(S.inShop || list().length || S.open);
    }
    invPart();
  }
  function zeigen(on = !S.open) {
    style();
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'einkaufpanel';
      panel.setAttribute('aria-label', 'Einkäufe');
      panel.hidden = true;
      (document.getElementById('stage') || document.body).appendChild(panel);
    }
    S.open = !!on;
    panel.hidden = !S.open;
    refresh();
    return S.open;
  }
  // the purse button at the top right (before the menu button), shown in a shop or once one has bought something
  function button() {
    if (btn || typeof document === 'undefined') return;
    const tr = document.getElementById('hudtr'),
      mb = document.getElementById('menubtn');
    if (!tr) return;
    style();
    btn = document.createElement('button');
    btn.id = 'einkaufbtn';
    btn.type = 'button';
    btn.title = 'Einkäufe und Geldbörse';
    btn.setAttribute('aria-label', 'Einkäufe und Geldbörse');
    btn.hidden = true;
    btn.onclick = () => zeigen();
    if (mb && mb.parentNode === tr) tr.insertBefore(btn, mb);
    else tr.appendChild(btn);
    refresh();
  }
  // a part of the inventory window (I): the bought things under the bar and the bag
  function invPart() {
    const w = typeof document !== 'undefined' && document.getElementById('invwin');
    if (!w || w.hidden) return;
    let d = w.querySelector('.einkauf-inv');
    const L = list();
    const h =
      '<h4>Einkäufe · ' +
      esc(GELD.text()) +
      '</h4>' +
      (L.length
        ? L.slice(0, 12)
            .map(q => '<div><img alt="" src="' + q.bild + '">' + q.n + ' × ' + esc(q.name) + '</div>')
            .join('')
        : '<div>noch nichts gekauft</div>');
    if (!d) {
      d = document.createElement('div');
      d.className = 'einkauf-inv';
      w.appendChild(d);
    }
    if (d.innerHTML !== h) d.innerHTML = h;
  }
  if (typeof document !== 'undefined') {
    const w = document.getElementById('invwin');
    if (w && typeof MutationObserver === 'function')
      new MutationObserver(() => {
        if (!w.hidden && !w.querySelector('.einkauf-inv')) invPart();
      }).observe(w, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    button();
    KERN.on('geld', () => refresh());
  }
  S.inShop = false;
  // in a shop the purse shows (laeden/kauf.js says so)
  S.imLaden = v => {
    if (S.inShop === !!v) return;
    S.inShop = !!v;
    refresh();
  };
  return Object.assign(S, {
    KEY,
    add,
    has,
    take,
    anzahl,
    list,
    gewicht,
    bon,
    bons: () => S.bonList.slice(),
    zeigen,
    bild,
    refresh,
  });
})();
window.INVENTAR = INVENTAR;
