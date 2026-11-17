// ===================== feat/laeden-leben 8: the goods' printed packaging and the price tags – one canvas atlas (WBILD) =====================
// Falko (17.11.2026): „Es muss realistischer aussehen, nicht bloß so schemenhaft. Auch in den Geschäften“. Every product of
// einkauf/waren.js gets a front as such a package has it – without any brand or logo: the plain product word in a sans-serif ("Kaffee",
// "Spirelli", "Wandfarbe"), what it is ("gemahlen", "mild"), the quantity ("500 g"), a simple picture of the contents (beans, a tomato, a
// glass of milk, wheat, noodles, a wood grain …) on the department's colours; a bottle's front is its glass with a label, a jar's its
// label, timber its wood with the sticker. And for each product a price tag for the shelf's edge (white, the price large, the name
// small). All drawn once into one canvas (2048² on a computer, 1024² on a phone) when the first shop's rooms are built; laeden/innen.js
// draws the fronts and tags with it (one material per standing shop, one program for all).
//   WBILD.tex() → THREE.Texture (made on first call) · WBILD.front(id) → [u0, v0, u1, v1] | null · WBILD.tag(id) → [u0, v0, u1, v1] | null
//   WBILD.status() → { made, ms, size, n }
import * as THREE from 'three';
import { COARSE } from '../core/head.js';
import { ANISO } from '../core/assets.js';
import { WAREN } from '../einkauf/waren.js';
export const WBILD = (() => {
  const S = { made: false, ms: 0, size: 0, n: 0, texture: null, F: new Map(), T: new Map(), H: new Map() };
  const FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
  // the colours of a department: ground, second colour, the ink
  const PAL = {
    kaffee: ['#5a3420', '#c8a060', '#f3ead8'],
    fruehstueck: ['#e3b23c', '#7a3b1c', '#2c2418'],
    konserven: ['#c63a2b', '#f2ede2', '#2b2b2b'],
    nudeln: ['#1f4f9a', '#f1d36a', '#ffffff'],
    gewuerze: ['#6d7f2e', '#f1e6c2', '#1f2410'],
    suess: ['#7a2c55', '#f4c542', '#ffffff'],
    knabber: ['#d8452f', '#f6d24a', '#ffffff'],
    backen: ['#f3efe4', '#2f5da8', '#1d2d55'],
    drogerie: ['#e9f2f8', '#3a7fc0', '#1b3550'],
    haushalt: ['#2d7fc1', '#f4f6f8', '#ffffff'],
    tier: ['#7a4a22', '#e9c46a', '#ffffff'],
    wein: ['#20321f', '#efe6cf', '#2a1c14'],
    wasser: ['#9fd0ea', '#ffffff', '#16507a'],
    milch: ['#ffffff', '#2f6fb3', '#1d3e66'],
    kaese: ['#f2c94c', '#ffffff', '#5a3a10'],
    wurst: ['#a8312c', '#f4e3d7', '#ffffff'],
    tk: ['#2a5fa8', '#e8f1fb', '#ffffff'],
    pflanzen: ['#3f7a2c', '#f2efe3', '#ffffff'],
    werkzeug: ['#c4281d', '#f2f2f0', '#ffffff'],
    farben: ['#f4f4f1', '#2f6db0', '#1d2a3a'],
    elektro: ['#2c5f9e', '#f5f5f5', '#ffffff'],
    sanitaer: ['#e8eef2', '#3477b5', '#1d3550'],
    eisenwaren: ['#7d838b', '#e9c44a', '#ffffff'],
    leuchten: ['#f2ead3', '#d18b1f', '#3a2a10'],
    haushaltobi: ['#2d7fc1', '#f4f6f8', '#ffffff'],
    garten: ['#4c7a33', '#f0e6c8', '#ffffff'],
    boden: ['#efe9dd', '#9b7a4e', '#3a2c1c'],
    fliesen: ['#ece9e2', '#7d8a94', '#2c3238'],
    baustoffe: ['#d9d4c8', '#c0392b', '#2b2b2b'],
    holz: ['#d8b77e', '#b38c52', '#3b2a14'],
  };
  // the words of a product: its main word, what it is, the quantity ("Kaffee, gemahlen 500 g" → Kaffee · gemahlen · 500 g)
  function words(w) {
    let n = w.name.replace(/\s*\(\+[^)]*\)/, '').replace(/\s*\([^)]*\)/, m => ' ' + m.slice(2, -1));
    const q = n.match(/(\d[\d,.]*\s?(?:×\s?\d[\d,.]*\s?)?(?:g|kg|l|ml|m²|Stück|Rollen|Beutel|Päckchen|mm|cm|m)\b.*)$/);
    let qty = '';
    if (q) {
      qty = q[1].trim();
      n = n.slice(0, q.index).trim();
    }
    const parts = n.split(/,\s+/);
    let main = parts[0],
      sub = parts.slice(1).join(', ');
    // a long name: its noun large, the rest small – the first capitalised word that is not an adjective or a qualifier ("Deutsche
    // Markenbutter" → Markenbutter, "Rotwein trocken" → Rotwein, "Weizenmehl Type 405" → Weizenmehl)
    const ws = main.split(' ');
    if (ws.length > 1 && main.length > 11) {
      const NOT = /^(Frische|Deutsche|Weiße|Thüringer|Art|Mittelscharfer|Löslicher|Gelbe|Kasten)$/;
      let k = ws.findIndex(w2 => /^[A-ZÄÖÜ]/.test(w2) && !NOT.test(w2));
      if (k < 0) k = ws.length - 1;
      const rest = ws.filter((w2, i) => i !== k).join(' ');
      main = ws[k];
      sub = rest + (sub ? ', ' + sub : '');
    }
    return { main, sub: sub.replace(/,\s*$/, ''), qty: qty.replace(/,$/, '') };
  }
  const h = s => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
    return (x >>> 0) / 4294967296;
  };
  // text fitted into a width: as large as it fits up to px
  function fit(q, t, x, y, w, px, weight = 700, align = 'center') {
    let s = px;
    q.font = weight + ' ' + s + 'px ' + FONT;
    while (s > 6 && q.measureText(t).width > w) {
      s -= 1;
      q.font = weight + ' ' + s + 'px ' + FONT;
    }
    q.textAlign = align;
    q.textBaseline = 'middle';
    q.fillText(t, x, y);
  }
  // ---- a little picture of the contents ----
  function picture(q, w, cx, cy, r, P) {
    const c = w.cat,
      id = w.id;
    q.save();
    const dot = (x, y, rr, col) => {
      q.fillStyle = col;
      q.beginPath();
      q.arc(x, y, rr, 0, Math.PI * 2);
      q.fill();
    };
    if (c === 'kaffee') {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.3,
          x = cx + Math.cos(a) * r * 0.45,
          y = cy + Math.sin(a) * r * 0.35;
        q.fillStyle = '#3b1f10';
        q.beginPath();
        q.ellipse(x, y, r * 0.26, r * 0.17, a, 0, Math.PI * 2);
        q.fill();
        q.strokeStyle = '#a57a4a';
        q.lineWidth = Math.max(1, r * 0.04);
        q.beginPath();
        q.moveTo(x - Math.cos(a) * r * 0.2, y - Math.sin(a) * r * 0.2);
        q.lineTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
        q.stroke();
      }
    } else if (c === 'milch' || id === 'joghurt' || id === 'quark') {
      q.fillStyle = '#ffffff';
      q.fillRect(cx - r * 0.35, cy - r * 0.55, r * 0.7, r * 1.1);
      q.strokeStyle = P[1];
      q.lineWidth = Math.max(1, r * 0.06);
      q.strokeRect(cx - r * 0.35, cy - r * 0.55, r * 0.7, r * 1.1);
      dot(cx + r * 0.55, cy - r * 0.45, r * 0.16, P[1]);
      dot(cx + r * 0.7, cy - r * 0.15, r * 0.1, P[1]);
    } else if (c === 'konserven' || id === 'tomaten_dose') {
      dot(
        cx,
        cy,
        r * 0.55,
        id === 'mais' ? '#f2c230' : id === 'bohnen' ? '#efe6d0' : id === 'erbsensuppe' ? '#6c9a35' : '#d2321f'
      );
      q.fillStyle = '#3f7a2c';
      q.beginPath();
      q.ellipse(cx, cy - r * 0.52, r * 0.22, r * 0.09, 0, 0, Math.PI * 2);
      q.fill();
    } else if (c === 'nudeln') {
      q.strokeStyle = '#f1d36a';
      q.lineWidth = Math.max(2, r * 0.12);
      for (let i = 0; i < 4; i++) {
        q.beginPath();
        q.arc(cx - r * 0.45 + i * r * 0.3, cy, r * 0.22, 0, Math.PI * 1.6);
        q.stroke();
      }
    } else if (c === 'backen' || id === 'mehl') {
      q.strokeStyle = '#c99a3a';
      q.lineWidth = Math.max(1, r * 0.06);
      for (const s of [-1, 0, 1]) {
        q.beginPath();
        q.moveTo(cx + s * r * 0.3, cy + r * 0.6);
        q.lineTo(cx + s * r * 0.2, cy - r * 0.3);
        q.stroke();
        for (let k = 0; k < 4; k++)
          for (const e of [-1, 1]) {
            q.fillStyle = '#d9ad4a';
            q.beginPath();
            q.ellipse(
              cx + s * r * 0.2 + e * r * 0.08,
              cy - r * 0.3 + k * r * 0.18,
              r * 0.07,
              r * 0.12,
              e * 0.5,
              0,
              Math.PI * 2
            );
            q.fill();
          }
      }
    } else if (c === 'suess' || c === 'knabber') {
      for (let i = 0; i < 6; i++)
        dot(
          cx + Math.cos(i) * r * 0.42,
          cy + Math.sin(i * 1.7) * r * 0.3,
          r * 0.17,
          ['#f4c542', '#e24b4b', '#5fb34a', '#ffffff'][i % 4]
        );
    } else if (c === 'wurst' || id === 'bratwurst') {
      q.fillStyle = '#9b4a2a';
      q.beginPath();
      q.ellipse(cx, cy, r * 0.62, r * 0.18, -0.2, 0, Math.PI * 2);
      q.fill();
      q.fillStyle = '#c86a42';
      q.beginPath();
      q.ellipse(cx, cy - r * 0.04, r * 0.55, r * 0.07, -0.2, 0, Math.PI * 2);
      q.fill();
    } else if (c === 'kaese') {
      q.fillStyle = '#f6d05a';
      q.beginPath();
      q.moveTo(cx - r * 0.55, cy + r * 0.35);
      q.lineTo(cx + r * 0.55, cy + r * 0.35);
      q.lineTo(cx + r * 0.2, cy - r * 0.35);
      q.closePath();
      q.fill();
      dot(cx, cy + r * 0.1, r * 0.08, '#d9a92e');
      dot(cx + r * 0.25, cy + r * 0.2, r * 0.06, '#d9a92e');
    } else if (c === 'tk') {
      q.strokeStyle = '#ffffff';
      q.lineWidth = Math.max(1, r * 0.07);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        q.beginPath();
        q.moveTo(cx - Math.cos(a) * r * 0.5, cy - Math.sin(a) * r * 0.5);
        q.lineTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
        q.stroke();
      }
    } else if (c === 'fruehstueck' || c === 'tier') {
      dot(cx, cy, r * 0.5, '#f7f1e3');
      for (let i = 0; i < 7; i++)
        dot(
          cx + Math.cos(i * 2.4) * r * 0.3,
          cy + Math.sin(i * 2.4) * r * 0.25,
          r * 0.08,
          i % 2 ? '#c0392b' : '#d9a441'
        );
    } else if (c === 'werkzeug' || c === 'eisenwaren') {
      q.strokeStyle = '#3a3d42';
      q.lineWidth = Math.max(2, r * 0.16);
      q.beginPath();
      q.moveTo(cx - r * 0.45, cy + r * 0.45);
      q.lineTo(cx + r * 0.35, cy - r * 0.35);
      q.stroke();
      q.fillStyle = '#8e939a';
      q.fillRect(cx + r * 0.1, cy - r * 0.6, r * 0.5, r * 0.25);
    } else if (c === 'farben') {
      q.fillStyle = id === 'lasur' ? '#8a5a2b' : id === 'leinoel' ? '#c9a046' : '#f6f6f2';
      q.beginPath();
      q.ellipse(cx, cy, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
      q.fill();
      q.strokeStyle = P[1];
      q.lineWidth = Math.max(1, r * 0.07);
      q.stroke();
    } else if (c === 'garten' || c === 'pflanzen') {
      q.fillStyle = '#5a3a20';
      q.fillRect(cx - r * 0.5, cy + r * 0.2, r, r * 0.3);
      for (let i = 0; i < 3; i++) {
        q.fillStyle = '#5fa84a';
        q.beginPath();
        q.ellipse(cx - r * 0.25 + i * r * 0.25, cy, r * 0.12, r * 0.28, (i - 1) * 0.5, 0, Math.PI * 2);
        q.fill();
      }
    } else if (c === 'wasser' || c === 'wein') {
      dot(cx, cy, r * 0.45, c === 'wein' ? '#7a1f2a' : '#d9eef8');
      q.strokeStyle = P[2];
      q.lineWidth = Math.max(1, r * 0.05);
      q.stroke();
    } else {
      // household, chemist, electrics …: a plain emblem
      dot(cx, cy, r * 0.42, P[1]);
      dot(cx, cy, r * 0.2, P[0]);
    }
    q.restore();
  }
  // ---- one front: the package of product w in the cell x, y, W, H ----
  function front(q, w, x, y, W, H) {
    const P = PAL[w.cat] || ['#9a8f80', '#f2efe6', '#ffffff'],
      t = words(w),
      v = h(w.id),
      art = w.art;
    q.save();
    q.beginPath();
    q.rect(x, y, W, H);
    q.clip();
    if (w.cat === 'holz') {
      // timber: the wood itself (grain), a sticker with the size
      q.fillStyle = v < 0.5 ? '#d9b882' : '#cfa76c';
      q.fillRect(x, y, W, H);
      q.strokeStyle = 'rgba(120,80,40,0.35)';
      for (let i = 0; i < 14; i++) {
        q.lineWidth = 1 + ((i * 7) % 3);
        q.beginPath();
        const yy = y + (i + 0.5) * (H / 14);
        q.moveTo(x, yy);
        q.bezierCurveTo(x + W * 0.3, yy + H * 0.03 * Math.sin(i), x + W * 0.7, yy - H * 0.03, x + W, yy + H * 0.02);
        q.stroke();
      }
      q.fillStyle = '#ffffff';
      q.fillRect(x + W * 0.55, y + H * 0.58, W * 0.4, H * 0.3);
      q.fillStyle = '#222';
      fit(q, t.qty || t.main, x + W * 0.75, y + H * 0.73, W * 0.36, H * 0.12, 600);
      q.restore();
      return;
    }
    if (art === 'bottle') {
      // the glass (or plastic) and a label in the middle
      const glass =
        w.cat === 'wein'
          ? v < 0.5
            ? '#1d3a1c'
            : '#3a1818'
          : w.cat === 'wasser'
            ? '#bfe0f0'
            : w.cat === 'gewuerze'
              ? '#e0b84a'
              : P[0];
      q.fillStyle = glass;
      q.fillRect(x, y, W, H);
      q.fillStyle = 'rgba(255,255,255,0.25)';
      q.fillRect(x + W * 0.12, y, W * 0.1, H);
      q.fillStyle = w.cat === 'wein' ? '#f1e8cf' : P[1];
      q.fillRect(x, y + H * 0.3, W, H * 0.42);
      q.fillStyle = w.cat === 'wein' ? '#5a1f22' : P[2] === '#ffffff' ? P[0] : P[2];
      fit(q, t.main, x + W / 2, y + H * 0.45, W * 0.86, H * 0.13);
      fit(q, t.qty || t.sub, x + W / 2, y + H * 0.62, W * 0.8, H * 0.08, 500);
      q.restore();
      return;
    }
    // ground, a band for the name, the picture, the quantity
    q.fillStyle = P[0];
    q.fillRect(x, y, W, H);
    if (art === 'can') {
      q.fillStyle = '#d7d9dc';
      q.fillRect(x, y, W, H * 0.07);
      q.fillRect(x, y + H * 0.93, W, H * 0.07);
    }
    if (art === 'bag') {
      // a window onto the contents
      q.fillStyle = 'rgba(255,255,255,0.18)';
      q.fillRect(x + W * 0.08, y + H * 0.04, W * 0.84, H * 0.05);
    }
    const bandY = y + H * (art === 'pack' ? 0.08 : 0.12),
      bandH = H * (art === 'pack' ? 0.3 : 0.24);
    q.fillStyle = P[1];
    q.fillRect(x, bandY, W, bandH);
    q.fillStyle = P[1] === '#ffffff' || P[1] === '#f2ede2' || P[1] === '#f4f6f8' ? P[0] : P[2];
    if (q.fillStyle === P[1]) q.fillStyle = '#222';
    fit(q, t.main, x + W / 2, bandY + bandH * 0.5, W * 0.9, bandH * 0.62);
    q.fillStyle = P[2];
    if (t.sub) fit(q, t.sub, x + W / 2, bandY + bandH + H * 0.07, W * 0.88, H * 0.075, 500);
    if (art === 'pack') {
      picture(q, w, x + W * 0.3, y + H * 0.66, Math.min(W * 0.3, H * 0.26), P);
      q.fillStyle = P[2];
      if (t.qty) fit(q, t.qty, x + W * 0.72, y + H * 0.7, W * 0.46, H * 0.1, 600);
    } else {
      picture(q, w, x + W / 2, y + H * 0.62, Math.min(W, H) * 0.32, P);
      q.fillStyle = P[2];
      if (t.qty) fit(q, t.qty, x + W / 2, y + H * 0.9, W * 0.8, H * 0.07, 600);
    }
    q.restore();
  }
  // ---- loose goods seen from above: fruit and vegetables in a crate, rolls on a tray, plants in pots ----
  const LOSE = {
    aepfel: ['#b8261c', '#d9452b', 'apfel'],
    orangen: ['#e6801c', '#f29a2e', 'rund'],
    bananen: ['#e8c63a', '#f2d65a', 'banane'],
    birnen: ['#a6b83a', '#c2cc56', 'birne'],
    trauben: ['#a9c45a', '#c4d978', 'traube'],
    pflaumen: ['#4a2445', '#6b3561', 'oval'],
    salat: ['#7fb23e', '#a6cc5a', 'salat'],
    moehren: ['#e2731c', '#f08a2a', 'moehre'],
    tomaten: ['#c8261a', '#e0402a', 'tomate'],
    kartoffeln: ['#b08a52', '#c9a36a', 'knolle'],
    zwiebeln: ['#c9923e', '#e0b060', 'rund'],
    gurke: ['#2f5e22', '#477a32', 'gurke'],
    broetchen: ['#c98c45', '#e0a85a', 'broetchen'],
    brot: ['#8a5528', '#a86a35', 'laib'],
    kraeuter: ['#3f7a2c', '#5a9a3c', 'blatt'],
    topfblume: ['#3f7a2c', '#d23a5a', 'bluete'],
  };
  function lose(q, id, x, y, W, H) {
    const [c0, c1, form] = LOSE[id];
    q.save();
    q.beginPath();
    q.rect(x, y, W, H);
    q.clip();
    q.fillStyle = form === 'broetchen' || form === 'laib' ? '#d9c8a8' : '#3a2a1c';
    q.fillRect(x, y, W, H);
    const r = W / 9;
    let k = 0;
    for (let j = 0; j < 9; j++)
      for (let i = 0; i < 9; i++) {
        const cx = x + (i + 0.5 + (j % 2 ? 0.45 : 0)) * (W / 9),
          cy = y + (j + 0.5) * (H / 9),
          v = h(id + k++),
          col = v < 0.5 ? c0 : c1,
          a = v * 6.28;
        q.fillStyle = col;
        q.beginPath();
        if (form === 'banane' || form === 'moehre' || form === 'gurke') {
          q.ellipse(cx, cy, r * 1.25, r * 0.45, a, 0, Math.PI * 2);
        } else if (
          form === 'birne' ||
          form === 'oval' ||
          form === 'knolle' ||
          form === 'broetchen' ||
          form === 'laib'
        ) {
          q.ellipse(cx, cy, r * (form === 'laib' ? 1.2 : 0.95), r * (form === 'laib' ? 0.8 : 0.72), a, 0, Math.PI * 2);
        } else if (form === 'traube') {
          for (let t = 0; t < 5; t++) {
            q.moveTo(cx + Math.cos(t * 1.3) * r * 0.45 + r * 0.32, cy + Math.sin(t * 1.3) * r * 0.45);
            q.arc(cx + Math.cos(t * 1.3) * r * 0.45, cy + Math.sin(t * 1.3) * r * 0.45, r * 0.32, 0, Math.PI * 2);
          }
        } else if (form === 'salat' || form === 'blatt') {
          for (let t = 0; t < 6; t++) {
            q.moveTo(cx, cy);
            q.ellipse(
              cx + Math.cos(a + t) * r * 0.4,
              cy + Math.sin(a + t) * r * 0.4,
              r * 0.62,
              r * 0.36,
              a + t,
              0,
              Math.PI * 2
            );
          }
        } else q.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
        q.fill();
        // light from above: a highlight; the details of each kind
        q.fillStyle = 'rgba(255,255,255,0.22)';
        q.beginPath();
        q.arc(cx - r * 0.25, cy - r * 0.25, r * 0.28, 0, Math.PI * 2);
        q.fill();
        if (form === 'tomate' || form === 'apfel') {
          q.fillStyle = form === 'tomate' ? '#3f7a2c' : '#4a3020';
          q.fillRect(cx - r * 0.08, cy - r * 0.08, r * 0.16, r * 0.16);
        }
        if (form === 'broetchen' || form === 'laib') {
          q.strokeStyle = 'rgba(240,215,160,0.9)';
          q.lineWidth = Math.max(1, r * 0.12);
          q.beginPath();
          q.moveTo(cx - Math.cos(a) * r * 0.6, cy - Math.sin(a) * r * 0.6);
          q.lineTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6);
          q.stroke();
        }
        if (form === 'bluete' && v > 0.45) {
          q.fillStyle = ['#d23a5a', '#f2c53a', '#9a4ad2', '#f4f0f0'][k % 4];
          q.beginPath();
          q.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
          q.fill();
        }
      }
    q.restore();
  }
  // ---- a price tag: white, the price large, the name small (as on German shelf edges) ----
  function tag(q, w, x, y, W, H) {
    q.fillStyle = '#fbfbf7';
    q.fillRect(x, y, W, H);
    q.fillStyle = '#f2d21b';
    q.fillRect(x, y, W * 0.06, H);
    q.fillStyle = '#111';
    const e = Math.floor(w.preis / 100),
      c = String(w.preis % 100).padStart(2, '0');
    fit(q, e + ',' + c, x + W * 0.6, y + H * 0.62, W * 0.62, H * 0.62, 800);
    fit(q, words(w).main, x + W * 0.5, y + H * 0.17, W * 0.86, H * 0.2, 500);
    q.font = '600 ' + Math.round(H * 0.2) + 'px ' + FONT;
    q.textAlign = 'left';
    q.fillText('€', x + W * 0.09, y + H * 0.7);
  }
  function make() {
    if (S.made) return S.texture;
    const t0 = performance.now(),
      N = COARSE ? 1024 : 2048,
      cell = N / 16;
    let cv = null;
    try {
      cv = document.createElement('canvas');
      cv.width = cv.height = N;
      const q = cv.getContext('2d');
      q.fillStyle = '#808080';
      q.fillRect(0, 0, N, N);
      const L = WAREN.list().filter(w => w.art !== 'heap' && w.art !== 'loaf' && w.art !== 'crate');
      L.forEach((w, i) => {
        if (i >= 128) return;
        const x = (i % 16) * cell,
          y = Math.floor(i / 16) * cell;
        // a hair of margin against the neighbours' colours in the mipmaps
        front(q, w, x + 1, y + 1, cell - 2, cell - 2);
        S.F.set(w.id, [(x + 2) / N, 1 - (y + cell - 2) / N, (x + cell - 2) / N, 1 - (y + 2) / N]);
      });
      // the tags: half-height cells below
      WAREN.list().forEach((w, i) => {
        if (i >= 256) return;
        const x = (i % 16) * cell,
          y = N / 2 + Math.floor(i / 16) * (cell / 2);
        tag(q, w, x + 1, y + 1, cell - 2, cell / 2 - 2);
        S.T.set(w.id, [(x + 2) / N, 1 - (y + cell / 2 - 2) / N, (x + cell - 2) / N, 1 - (y + 2) / N]);
      });
      // loose goods from above: the last two rows of the upper half (from cell 224 on)
      Object.keys(LOSE).forEach((id, i) => {
        const x = (i % 16) * cell,
          y = (14 + Math.floor(i / 16)) * cell;
        lose(q, id, x + 1, y + 1, cell - 2, cell - 2);
        S.H.set(id, [(x + 2) / N, 1 - (y + cell - 2) / N, (x + cell - 2) / N, 1 - (y + 2) / N]);
      });
      S.n = L.length;
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
    }
    const tex = cv ? new THREE.CanvasTexture(cv) : new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(4, ANISO || 1);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    S.texture = tex;
    S.made = true;
    S.size = N;
    S.ms = Math.round(performance.now() - t0);
    return tex;
  }
  return Object.assign(S, {
    tex: () => make(),
    front: id => (S.made || make() ? S.F.get(id) || null : null),
    tag: id => (S.made || make() ? S.T.get(id) || null : null),
    lose: id => (S.made || make() ? S.H.get(id) || null : null),
    words,
    status: () => ({ made: S.made, ms: S.ms, size: S.size, n: S.n, err: S.err || '' }),
  });
})();
window.WBILD = WBILD;
