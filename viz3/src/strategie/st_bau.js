// ===================== feat/strategie-bau: the pavilion from above – construction phases as real projects, as the ages (STBAU) =====================
// Falko's big goal in „Ratscher von oben“ (plan_strategie.md 4, 6, 12): the pavilion phase by phase like the ages of Age of Empires, each a
// real project – before the first one the old garage's slab is uncovered and checked, building law is asked (a preliminary decision of the
// building authority: Gebäudeklasse 1 in the outer area), a structural engineer calculates, the permit is applied for; then for every phase
// material is ordered (bought, or own timber from the Klinge: dried and graded) and delivered, a crew with the skills (Christoph's building,
// Hubert's tractor) works in a weather window, Euro go out, days pass. A finished phase sets the world's phase (game/walkable.js setPhase):
// the first-person world shows it too, and it stays after a reload. Data: strategie/st_bau_data.js; phases: pavilion/phases.js.
// State: STRAT.S.ext.bau (saved with pav-strat-v1). API: window.STBAU (docs/features/strategie-bau.md).
import * as THREE from 'three';
import { KERN } from '../core/kern.js';
import { scene, V, VARIANT } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { canvasTex, redraw } from '../garden/garten_kit.js';
import { P as VIEWP, PHASE, setPhase } from '../game/walkable.js';
import { PHASES } from '../pavilion/phases.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { HOLZ } from '../werk/holz.js';
import { HOLZSAW } from '../werk/holz_saw.js';
import { HOLZDRY } from '../werk/holz_dry.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
import { STRAT } from './st_modus.js';
import { STJOBS } from './st_jobs.js';
import { STBAUDATA } from './st_bau_data.js';
export const STBAU = (() => {
  const D = STDATA,
    C = STCORE,
    B = STBAUDATA,
    W = STRAT.W,
    S = STRAT.S;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const eur = v => Math.round(v).toLocaleString('de-DE') + ' €';
  const names = who => who.map(id => D.PEOPLE[id].name).join(' und ');
  const LAST = () => PHASES.length - 1;
  const now = () => CLOCK.t;
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  // ---------------- the state (STRAT.S.ext.bau – checked whenever it is read: a reload, a broken save, the save fuzzer) ----------------
  function st() {
    let b = S.ext.bau;
    if (!b || typeof b !== 'object' || Array.isArray(b)) b = S.ext.bau = {};
    if (b.v !== 1) {
      for (const k of Object.keys(b)) delete b[k];
      b.v = 1;
    }
    if (typeof b.started !== 'boolean') b.started = false;
    if (!(Number.isInteger(b.ph) && b.ph >= 0 && b.ph <= 40)) b.ph = null;
    for (const k of ['platte', 'vb', 'statik', 'gen', 'geruest'])
      if (b[k] != null && (typeof b[k] !== 'object' || Array.isArray(b[k]))) b[k] = null;
    if (b.platte && !(isNum(b.platte.thick) && isNum(b.platte.apron))) b.platte = null;
    if (b.gen && !isNum(b.gen.start)) b.gen = null;
    if (!Array.isArray(b.waits)) b.waits = [];
    b.waits = b.waits.filter(w => w && typeof w.k === 'string' && isNum(w.t)).slice(0, 20);
    for (const k of ['mat', 'order']) if (!b[k] || typeof b[k] !== 'object' || Array.isArray(b[k])) b[k] = {};
    for (const [k, o] of Object.entries(b.order)) if (!o || !isNum(o.due)) delete b.order[k];
    for (const k of ['kvh', 'spent', 'seed', 'dryUntil']) if (!isNum(b[k])) b[k] = k === 'seed' ? 0 : 0;
    if (typeof b.streifen !== 'boolean') b.streifen = false;
    if (!b.konto || typeof b.konto !== 'object') b.konto = {};
    const K = b.konto;
    if (!B.KONTO.rates.includes(K.rate)) K.rate = B.KONTO.rate;
    if (!B.KONTO.starts.includes(K.start)) K.start = B.KONTO.start;
    if (typeof K.paid !== 'string') K.paid = '';
    return b;
  }
  const built = () => {
    const b = st();
    return b.ph != null ? b.ph : PHASE;
  };
  const next = () => Math.min(LAST() + 1, built() + 1);
  const phaseOf = n => PHASES[n] || null;
  const meta = n => B.PH[n] || { crew: [2, 3], min: 2, heavy: 0.5 };
  const learnOf = n => {
    const M = meta(n),
      b = VARIANT === 'B' && M.learnB;
    return {
      text: b ? M.learnB : M.learn || (phaseOf(n) && phaseOf(n).check ? phaseOf(n).check[0] : ''),
      src: b ? M.srcB : M.src || 'Planung des Pavillons (pavilion/phases.js)',
    };
  };
  const matOf = n => (st().mat[n] === 'eigen' && B.eigenKind(phaseOf(n) || {}) ? 'eigen' : 'kauf');
  const costOf = (n, m = matOf(n)) => B.phaseCost(phaseOf(n) || { items: [] }, m === 'eigen');
  // ---------------- the weather of a moment: STRAT's (feat/wetter near the clock, else the climate) plus the temperature ----------------
  function tempOf(t) {
    if (W.force && isNum(W.force.temp)) return W.force.temp;
    const L = window.WETTER;
    if (
      L &&
      typeof L.state === 'function' &&
      Math.abs(t - CLOCK.t) < 90 &&
      ['jetzt', 'stunde', 'probe'].includes(L.src)
    )
      try {
        const s = L.state(),
          w = s.w || s.cur || {};
        if (isNum(w.temp)) return w.temp;
      } catch (e) {}
    const d = Math.floor(t / 1440),
      dev = (C.rng(((DN.e0 + d) * 48271) | 0)() - 0.5) * 2;
    return B.tempAt(W.dateOf(t).getUTCMonth(), W.minOf(t), dev);
  }
  const wxAt = t => Object.assign({}, W.wx(t), { temp: tempOf(t) });
  // the next days of a phase's weather window (10 and 14 o'clock): [{ label, ok, why }]
  function windowDays(n, days = 7) {
    const M = meta(n),
      t0 = Math.floor(now() / 1440) * 1440,
      out = [];
    for (let k = 0; k < days; k++) {
      const a = B.wxFail(M.wx, wxAt(t0 + k * 1440 + 10 * 60), M.inside),
        c = B.wxFail(M.wx, wxAt(t0 + k * 1440 + 14 * 60), M.inside);
      out.push({ label: W.day(t0 + k * 1440, S.plan).label.slice(0, 2), ok: !a || !c, why: (a || c || {}).text || '' });
    }
    return out;
  }
  // ---------------- money: the savings for the building and the monthly rate ----------------
  function bookBau(e, text) {
    const b = st();
    if (e < 0) b.spent = Math.round((b.spent - e) * 100) / 100;
    return STRAT.book(e, text, 'bau');
  }
  function begin() {
    const b = st();
    if (b.started) return { no: true, text: 'Die Baukasse gibt es schon.' };
    b.started = true;
    if (b.ph == null) b.ph = PHASE;
    if (!b.seed) b.seed = Math.floor(Math.random() * 1e9) | 0 || 7;
    b.konto.paid = monthKey(now());
    if (b.konto.start > 0) STRAT.book(b.konto.start, 'Ersparnisse für den Pavillon (Baukasse)', 'bau');
    // the world stands further already (a test server, the phase slider): what lies before counts as done
    if (b.ph >= 1) {
      b.platte = b.platte || { thick: 15, rebar: true, apron: 80, flat: 8, ok: true, t: Math.round(now()), auto: true };
      b.vb = b.vb || { t: Math.round(now()), ok: true, auto: true };
      b.statik = b.statik || { t: Math.round(now()), auto: true };
      b.gen = b.gen || { t: Math.round(now()), start: Math.round(now()), auto: true };
      STRAT.note(`Die Welt steht schon in Bauphase ${b.ph} – Platte, Statik und Genehmigung gelten als erledigt.`, {
        kind: 'bau',
      });
    }
    STRAT.emit('bau', { what: 'start', ph: b.ph });
    STRAT.save();
    return { ok: true, text: 'Baukasse angelegt' + (b.konto.start ? ': ' + eur(b.konto.start) : '') };
  }
  const monthKey = t => {
    const d = W.dateOf(t);
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1);
  };
  // each new game day (STRAT's 'tag'): the monthly rate on the first, the scaffold's rent on Mondays after its first eight weeks
  KERN.on('strategie:tag', ev => {
    const b = st();
    if (!b.started) return;
    const t = ev && isNum(ev.t) ? ev.t : now(),
      mk = monthKey(t);
    if (b.konto.rate > 0 && mk !== b.konto.paid && W.dateOf(t).getUTCDate() === 1) {
      b.konto.paid = mk;
      STRAT.book(b.konto.rate, 'Sparrate Pavillon', 'bau');
    }
    const G = b.geruest;
    if (G && !G.off && W.dateOf(t).getUTCDay() === 1 && t - G.t > 8 * 7 * 1440) {
      bookBau(-B.PREP.geruest.week, 'Gerüstmiete (eine Woche)');
      G.weeks = (G.weeks || 0) + 1;
    }
  });
  // ---------------- the slab: what one finds when digging (drawn once a game, from its seed) ----------------
  let forcePlatte = null;
  function findSlab() {
    if (forcePlatte) return Object.assign({}, forcePlatte);
    const r = C.rng(st().seed * 7 + 13),
      pick = L => {
        let x = r(),
          v = L[L.length - 1][0];
        for (const [val, p] of L) {
          if (x < p) {
            v = val;
            break;
          }
          x -= p;
        }
        return v;
      };
    const thick = pick(B.SLAB.thick),
      apron = pick(B.SLAB.apron),
      rebar = r() < (thick >= 12 ? B.SLAB.rebar : 0.3),
      flat = Math.round(4 + r() * 12);
    return { thick, apron, rebar, flat };
  }
  // ---------------- external dates: the building authority, the engineer, deliveries ----------------
  function waitFor(k, days, text) {
    const b = st();
    b.waits = b.waits.filter(w => w.k !== k);
    const w = { k, t: Math.round(now() + days * 1440), text };
    b.waits.push(w);
    return w;
  }
  const waiting = k => st().waits.find(w => w.k === k) || null;
  function resolve(w) {
    const b = st();
    b.waits = b.waits.filter(x => x !== w);
    if (w.k === 'vb') {
      b.vb = { t: w.t, ok: true };
      const P = B.PREP.voranfrage;
      STRAT.note(
        'Vorbescheid des Bauamts: Der Pavillon ersetzt die Garage auf derselben Platte und ist als „sonstiges Vorhaben“ im Außenbereich in Aussicht gestellt – mit Auflagen: Abstandsflächen zur Grenze (0,4 H, mindestens 3 m: § 6 Abs. 5 ThürBO – gut 7 m sind da), Brandschutz der Holzfassade, kein Wohnsitz. (Im Spiel angenommen; in Wirklichkeit entscheidet das Bauamt.)' +
          (VARIANT === 'B' ? ' Offen bleibt die Leitertreppe ins Obergeschoss (§ 37 ThürBO).' : ''),
        { kind: 'bau', why: P.learn, src: P.src }
      );
      STRAT.emit('bau', { what: 'vorbescheid' });
      learnt('p_bauordnung', 'tun:den Vorbescheid des Bauamts bekommen');
    } else if (w.k === 'statik') {
      b.statik = { t: w.t };
      const P = B.PREP.statik,
        ok = B.slabOk(b.platte);
      STRAT.note(
        `Die Statik ist da: Kragarme 0,9 m mit Kopfbändern, Ringbalken aus Brettschichtholz über dem Westglas, ${VARIANT === 'B' ? 'gut 22' : 'gut 20'} kN je Meter auf der Platte – ${ok || b.streifen ? 'die Platte trägt.' : 'die Platte braucht ein Streifenfundament am Rand.'}`,
        { kind: 'bau', why: P.learn, src: P.src }
      );
      STRAT.emit('bau', { what: 'statik' });
    } else if (w.k === 'gen') {
      const P = B.PREP.antrag;
      b.gen = { t: w.t, start: Math.round(w.t + P.start * 1440) };
      STRAT.note(
        `Baugenehmigung erteilt (im Spiel angenommen). Baubeginn angezeigt – ab ${W.day(b.gen.start).label} darf gebaut werden. Am Gartentor steht jetzt das Bauschild.`,
        {
          kind: 'bau',
          why: P.learn + ' ' + B.BOOK.why.bau_schild.text,
          src: P.src + '; § 11 Abs. 3 ThürBO (Baustellenschild)',
        }
      );
      STRAT.emit('bau', { what: 'genehmigung' });
    } else if (w.k.startsWith('lief:')) {
      const n = +w.k.slice(5);
      STRAT.note(`Lieferung für Bauphase ${n} (${phaseOf(n) ? phaseOf(n).name : ''}) ist auf dem Bauplatz.`, {
        kind: 'bau',
      });
    }
    STRAT.save();
  }
  let acc = 0;
  // ---------------- the discovery book (feat/wissen, WISSEN – it loads after this theme): our reasons as its rules with the exact
  // paragraph and a link, our entries found by doing. The strategy's own „Warum?“ finds a rule by its sentence (STRAT.D.RULES), the book
  // shows a rule of its own list (WISSEN.data.WHY) with linked sources – both get ours, nothing of theirs is replaced ----------------
  let booked = false;
  function book() {
    const WI = window.WISSEN;
    if (booked || !WI || typeof WI.add !== 'function' || !WI.data || !WI.data.WHY) return booked;
    booked = true;
    const RS = D.RULES || {},
      WHY = WI.data.WHY;
    for (const [id, w] of Object.entries(B.BOOK.why)) {
      if (!WHY[id]) WHY[id] = { title: w.title, text: w.text, src: w.src.map(q => [q[0], q[1]]) };
      if (!RS[id]) RS[id] = { text: w.text, why: w.text, src: w.src.map(q => q[0]).join('; ') };
    }
    for (const e of B.BOOK.entries) if (!WI.get(e.id)) WI.add(e);
    // the garden's protection against deer is the book's rule „verbiss“: the same sentence as our notes give
    const G = B.GARDEN.learn;
    if (!RS.verbiss && WHY.verbiss) RS.verbiss = { text: G.schutz, why: G.schutz, src: G.schutzSrc };
    return true;
  }
  // an entry of the book found by doing (how: 'tun:…'); without the book nothing happens
  function learnt(id, how) {
    try {
      if (book()) return window.WISSEN.found(id, how);
    } catch (e) {}
    return false;
  }
  KERN.tick(dt => {
    // the waits (a decision of the authority, a delivery) in every frame: a time-lapse may end right after their moment, and what came
    // is there as soon as the clock stops (src's Prüfpaket 42152070883 had looked half a second too early)
    const b = S.ext.bau;
    if (b && Array.isArray(b.waits) && b.waits.length)
      for (const w of b.waits.slice()) if (w && Number.isFinite(w.t) && w.t <= now()) resolve(w);
    if ((acc += dt) < 0.5) return;
    acc = 0;
    book();
    applySaved();
    bindPanel();
    if (window.PAV_LOADED) {
      signSync();
      pileSync();
    }
  }, 'strategie/bau');
  // ---------------- the world's phase: set by a finished phase, kept after a reload ----------------
  // once per page load, as soon as the model stands (boot/boot.js has set its start phase) and the saved state is in (or 30 s later: none)
  let applied = false,
    waitT = 0;
  function applySaved() {
    if (applied || !window.PAV_LOADED) return;
    const b = S.ext.bau;
    if (!(b && Number.isInteger(b.ph))) {
      if ((waitT += 0.5) > 30) applied = true;
      return;
    }
    applied = true;
    if (b.ph !== PHASE && b.ph >= 0 && b.ph <= LAST()) setPhase(b.ph);
  }
  KERN.on('strategie:modus', e => {
    if (!e || !e.on) return;
    const b = st();
    if (Number.isInteger(b.ph) && b.ph !== PHASE && b.ph <= LAST()) setPhase(b.ph);
    bindPanel();
    // the first time: where the new things are
    if (!b.hint) {
      b.hint = 1;
      setTimeout(
        () =>
          STRAT.note(
            'Neu von oben: der Bauplatz des Pavillons (Platte, Bauamt, Statik, Bauphase für Bauphase) und der Obstgarten des Gartenplaners – anklicken.',
            { kind: 'info' }
          ),
        2500
      );
    }
  });
  // ---------------- the construction sign by the garden gate (from the permit until the pavilion is done) ----------------
  // the building code wants it at the site, readable from the street: the project, the designer, the site manager, the builders of the
  // carcass. Its materials are the kit's (a canvas picture like the garden's pictures, oak posts): no new shader program.
  const SIGN = { g: null, key: '' };
  // just inside the north-west corner by the gate, facing the field track (site direction north-west; rotation about the up axis)
  const SIGN_AT = { x: -7.0, y: 36.2, az: -143 };
  function signDraw(q, w, h) {
    const b = st(),
      d = b.gen ? W.day(b.gen.t).label.replace(/^\w+ /, '') : '';
    q.fillStyle = '#f4f1e8';
    q.fillRect(0, 0, w, h);
    q.strokeStyle = '#1d3b6a';
    q.lineWidth = 10;
    q.strokeRect(6, 6, w - 12, h - 12);
    q.fillStyle = '#1d3b6a';
    q.fillRect(6, 6, w - 12, 62);
    q.fillStyle = '#ffffff';
    q.font = 'bold 40px sans-serif';
    q.fillText('BAUSTELLE', 24, 52);
    q.fillStyle = '#1b1b1b';
    q.font = 'bold 30px sans-serif';
    q.fillText('Gartenpavillon (Holzrahmenbau)', 24, 112, w - 48);
    q.font = '24px sans-serif';
    const L = [
      'Bauherr: Falko',
      'Entwurf und Statik: Ingenieurbüro (im Spiel)',
      'Bauleitung: Christoph',
      'Rohbau: Eigenleistung',
      'Baugenehmigung vom ' + d + ' · Gebäudeklasse 1',
      'Bauphase ' + built() + ' von ' + LAST(),
    ];
    // a long line is squeezed to the board's width rather than cut off at its edge
    L.forEach((t, i) => q.fillText(t, 24, 152 + i * 32, w - 48));
  }
  function signSync() {
    const b = S.ext.bau,
      on = !!(b && b.gen && Number.isInteger(b.ph) && b.ph < LAST() && PHASE === b.ph);
    if (!on) {
      if (SIGN.g) SIGN.g.visible = false;
      return;
    }
    if (!SIGN.g) {
      const g = new THREE.Group();
      g.name = 'strategie-bau Bauschild';
      const tex = canvasTex(512, 352),
        face = plain({ map: tex, roughness: 0.75 }),
        z0 = KERN.ground(SIGN_AT.x, SIGN_AT.y) || 0;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.96, 0.03), [
        MAT.oak,
        MAT.oak,
        MAT.oak,
        MAT.oak,
        face,
        face,
      ]);
      panel.position.y = 1.25;
      g.add(panel);
      for (const dx of [-0.62, 0.62]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.8, 0.07), MAT.oak);
        post.position.set(dx, 0.9, -0.04);
        g.add(post);
      }
      g.position.copy(V(SIGN_AT.x, SIGN_AT.y, z0));
      g.rotation.y = (SIGN_AT.az * Math.PI) / 180;
      scene.add(g);
      SIGN.g = g;
      SIGN.tex = tex;
    }
    const key = built() + ':' + (b.gen ? b.gen.t : '');
    if (key !== SIGN.key) {
      SIGN.key = key;
      redraw(SIGN.tex, signDraw);
    }
    SIGN.g.visible = true;
    markDirty(true);
  }
  // ---------------- the delivered material on the site: a pallet with timber and boards west of the slab, until its phase is built ----------------
  // (both lenses show what has come; the size follows the delivery's worth; materials of the kit and the shared oak: no new program)
  const PILE = { g: null, key: '' };
  function pileSync() {
    const b = S.ext.bau,
      n = b && Number.isInteger(b.ph) ? b.ph + 1 : null,
      o = n != null && b.order ? b.order[n] : null,
      on = !!(o && o.due <= now() && PHASE === b.ph && n <= LAST());
    if (!on) {
      if (PILE.g) PILE.g.visible = false;
      return;
    }
    if (!PILE.g) {
      const g = new THREE.Group();
      g.name = 'strategie-bau Lieferung';
      const pal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.8), MAT.oak),
        wood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 0.7), MAT.oak),
        foil = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.04, 0.74), plain({ color: 0x3d4a3a, roughness: 0.6 }));
      pal.position.y = 0.07;
      g.add(pal, wood, foil);
      PILE.wood = wood;
      PILE.foil = foil;
      scene.add(g);
      PILE.g = g;
    }
    const key = n + ':' + o.eur;
    if (key !== PILE.key) {
      PILE.key = key;
      const h = Math.max(0.2, Math.min(1.3, 0.2 + o.eur / 5000)),
        z0 = KERN.ground(-2.3, 0.6) || 0;
      PILE.wood.scale.y = h;
      PILE.wood.position.y = 0.14 + h / 2;
      PILE.foil.position.y = 0.14 + h + 0.02;
      PILE.g.position.copy(V(-2.3, 0.6, z0));
      PILE.g.rotation.y = 0.12;
    }
    PILE.g.visible = true;
    markDirty(true);
  }
  // ---------------- own timber: dry planks graded (DIN 4074), dry boards from the stack ----------------
  const vol = b => STJOBS.boardVol(b);
  const dryStack = thick =>
    (HOLZSAW.boards || []).filter(
      b => b.st === 'stack' && (thick ? b.t >= 0.045 : b.t < 0.045) && isNum(b.mc) && b.mc < 20
    );
  const sumVol = L => L.reduce((s, b) => s + vol(b), 0);
  function useBoards(m3, why) {
    let got = 0;
    for (const b of dryStack(false)) {
      if (got >= m3) break;
      b.st = 'used';
      b.bau = why;
      got += vol(b);
    }
    try {
      HOLZDRY.rebuild();
      HOLZ.save();
    } catch (e) {}
    markDirty(true);
    return got;
  }
  // the whole pavilion in own timber: structural timber, boards and the round wood it takes (sawn yield about 60 %)
  const YIELD = 0.6;
  let woodK = '',
    woodT = '';
  function woodAll() {
    const k = VARIANT + PHASES.length;
    if (k === woodK) return woodT;
    let kant = 0,
      brett = 0;
    for (let n = 1; n <= LAST(); n++) {
      const c = costOf(n, 'eigen');
      kant += c.kant;
      brett += c.brett;
    }
    woodK = k;
    woodT = `${de(kant, 1)} m³ Kantholz, ${de(brett, 1)} m³ Bretter ≈ ${Math.round((kant + brett) / YIELD)} fm Rundholz`;
    return woodT;
  }
  // ---------------- places ----------------
  STRAT.place.define({
    id: 'bauplatz',
    name: 'Bauplatz Pavillon',
    icon: '▦',
    order: 25,
    r: 5,
    pos: () => [2.0, -2.6],
    sub: () => {
      const n = built();
      return `Bauphase ${n} von ${LAST()} · ${esc(phaseOf(n) ? phaseOf(n).name : '')} · Variante ${VARIANT === 'A' ? 'A (Treppenturm)' : 'B (Leitertreppe)'}`;
    },
    stock: () => {
      const b = st(),
        dk = dryStack(true),
        db = dryStack(false);
      return [
        ['Ausgegeben für den Pavillon', eur(b.spent)],
        ['Eigenes Bauholz sortiert (S10)', de(b.kvh, 2) + ' m³'],
        ['Trockene Bohlen im Stapel (unsortiert)', dk.length + ' · ' + de(sumVol(dk), 2) + ' m³'],
        ['Trockene Bretter im Stapel', db.length + ' · ' + de(sumVol(db), 2) + ' m³'],
        ['Ganzer Pavillon aus eigenem Holz', woodAll()],
      ];
    },
    info: () => panelHTML(),
    badge: () => {
      const b = st(),
        n = next();
      if (n > LAST()) return 'fertig';
      const w = b.waits.slice().sort((x, y) => x.t - y.t)[0];
      if (w) return w.text + ' · ' + CLOCK.dur(w.t - now());
      const j = STRAT.job.running().find(x => x.def === 'bau' + n);
      return j
        ? `Phase ${n}: ${j.st === 'work' ? Math.round((100 * j.done) / Math.max(1, j.dur)) + ' %' : j.st === 'wait' ? 'wartet' : 'unterwegs'}`
        : 'Phase ' + n;
    },
    missing: () => missingFor(next()),
  });
  STRAT.place.define({
    id: 'bauamt',
    name: 'Bauamt (Landratsamt Hildburghausen)',
    icon: '§',
    order: 95,
    r: 30,
    // Hildburghausen lies about 8 km south-southwest of Ratscher (site metres: x east, y north)
    pos: () => [-2600, -8200],
    sub: () => 'Untere Bauaufsichtsbehörde für Schleusingen und seine Ortsteile',
  });
  // ---------------- what stops the next phase (the panel's „Es fehlt“) ----------------
  function missingFor(n) {
    const b = st(),
      out = [];
    if (n > LAST()) return out;
    if (!b.started) out.push('Baukasse anlegen (Ersparnisse, Sparrate)');
    if (!b.platte) out.push('Die Garagenplatte freilegen und prüfen');
    else if (!B.slabOk(b.platte) && !b.streifen && n >= 2) out.push('Streifenfundament am Plattenrand');
    if (n >= 1 && !b.gen) {
      if (!b.vb) out.push(waiting('vb') ? 'Vorbescheid des Bauamts (wartet)' : 'Bauvoranfrage beim Bauamt');
      if (!b.statik)
        out.push(waiting('statik') ? 'Statik (der Tragwerksplaner rechnet)' : 'Tragwerksplaner beauftragen');
      out.push(waiting('gen') ? 'Baugenehmigung (das Bauamt prüft)' : 'Bauantrag');
    } else if (b.gen && now() < b.gen.start) out.push('Baubeginn ab ' + W.day(b.gen.start).label);
    if (n >= B.PREP.geruest.from && n <= B.PREP.geruest.to && !(b.geruest && !b.geruest.off)) out.push('Gerüst');
    if (n >= 1) {
      const o = b.order[n];
      if (!o) out.push('Material für Phase ' + n + ' bestellen');
      else if (o.due > now()) out.push('Lieferung am ' + W.day(o.due).label);
    }
    if (n === 28 && b.dryUntil > now()) out.push('Lehmputz trocknet bis ' + W.day(b.dryUntil).label);
    return out;
  }
  // ---------------- the what-if: when could the pavilion stand? (weekends of three, the savings, deliveries, weather) ----------------
  // a quick forward estimate, not the simulation: each phase waits for its money (the cash plus the monthly rate), its delivery, then
  // weekend days (Saturday and most of Sunday, 8 h, three people; outside work on about two of three weekend days for the weather)
  function forecast() {
    const b = st(),
      n0 = next();
    if (n0 > LAST()) return null;
    let t = now(),
      cash = S.eur,
      paid = monthKey(t),
      money = 0,
      work = 0;
    const days = (from, d) => from + d * 1440;
    const addMonths = to => {
      // the rates that come in until time `to`
      let k = 0;
      for (let x = Math.floor(t / 1440) * 1440 + 1440; x <= to; x += 1440)
        if (W.dateOf(x).getUTCDate() === 1 && monthKey(x) !== paid) {
          paid = monthKey(x);
          cash += b.konto.rate;
          k++;
        }
      return k;
    };
    if (!b.gen) {
      const left = (waiting('gen') ? waiting('gen').t : t + 7 * 1440 * (b.vb ? 9 : b.statik ? 14 : 16)) - t;
      addMonths(t + left);
      t += left + B.PREP.antrag.start * 1440;
    } else t = Math.max(t, b.gen.start);
    for (let k = n0; k <= LAST(); k++) {
      const M = meta(k),
        c = b.order[k] ? 0 : costOf(k).eur;
      // money: wait for the rates until the phase can be paid
      let guard = 0;
      while (cash < c && b.konto.rate > 0 && guard++ < 600) {
        const t1 = days(t, 30);
        addMonths(t1);
        money += t1 - t;
        t = t1;
      }
      if (cash < c) return { stuck: k, cash, need: c };
      cash -= c;
      const lead = b.order[k] ? Math.max(0, b.order[k].due - t) : leadOf(k, matOf(k) === 'eigen') * 1440;
      addMonths(t + lead);
      t += lead;
      // the work: person-hours of three people, a weekend gives about 1,5 days of 8 h, outside on two of three
      const wd = B.crewMinutes(B.personHours(phaseOf(k).days), 3) / 60 / 8,
        weekends = Math.ceil(wd / 1.5 / (M.inside ? 1 : 0.67) - 1e-6),
        dt = weekends * 7 * 1440 + (k === 27 ? (M.dry || 14) * 1440 : 0);
      addMonths(t + dt);
      work += dt;
      t += dt;
    }
    return { t, money, work, by: money > work ? 'Geld' : 'Wochenenden' };
  }
  // ---------------- the panel of the building site ----------------
  function panelHTML() {
    const b = st(),
      n = next();
    let h = '';
    if (!b.started) {
      h += `<h4>Baukasse</h4><div class="sub">Ersparnisse für den Bau: <b>${eur(b.konto.start)}</b> <button type="button" class="stb" data-sb="start:-">−</button><button type="button" class="stb" data-sb="start:+">+</button> · Sparrate <b>${eur(b.konto.rate)}</b>/Monat <button type="button" class="stb" data-sb="rate:-">−</button><button type="button" class="stb" data-sb="rate:+">+</button></div><p><button type="button" class="stb acc" data-sb="begin">Bauprojekt beginnen</button></p><div class="learn">${esc(B.KONTO.src)}. Der Pavillon kostet je nach Variante und Eigenleistung netto etwa 42.000–76.000 €, mit 19 % Umsatzsteuer 50.000–91.000 € – ohne Arbeitszeit (Planung des Pavillons, pavilion/phases.js).</div>`;
    } else
      h += `<div class="sub">Sparrate <b>${eur(b.konto.rate)}</b>/Monat <button type="button" class="stb" data-sb="rate:-">−</button><button type="button" class="stb" data-sb="rate:+">+</button></div>`;
    // the preparation
    const tick = (ok, t) => `<li><span>${ok ? '☑' : '☐'} ${t}</span></li>`;
    const pl = b.platte;
    h += '<h4>Vorbereitung</h4><ul>';
    h += tick(
      !!pl,
      pl
        ? `Platte ${de(B.SLAB.size[0], 1)} × ${de(B.SLAB.size[1], 1)} m: ${pl.thick} cm, ${pl.rebar ? 'bewehrt (Matte)' : 'unbewehrt'}, Frostschürze ${pl.apron ? pl.apron + ' cm' : 'keine'}, Ebenheit ${pl.flat} mm auf 4 m – ${B.slabOk(pl) ? 'trägt' : b.streifen ? 'Streifenfundament ergänzt' : 'braucht ein Streifenfundament'}`
        : 'Garagenplatte freilegen und prüfen'
    );
    const wv = waiting('vb'),
      ws = waiting('statik'),
      wg = waiting('gen');
    h += tick(
      !!b.vb,
      b.vb
        ? 'Vorbescheid: in Aussicht gestellt (mit Auflagen)'
        : wv
          ? 'Bauvoranfrage – Antwort ' + W.day(wv.t).label
          : 'Bauvoranfrage beim Bauamt'
    );
    h += tick(
      !!b.statik,
      b.statik ? 'Statik liegt vor' : ws ? 'Statik – fertig ' + W.day(ws.t).label : 'Tragwerksplaner (Statik)'
    );
    h += tick(
      !!b.gen,
      b.gen
        ? 'Baugenehmigung · Baubeginn ab ' + W.day(b.gen.start).label
        : wg
          ? 'Bauantrag – Bescheid ' + W.day(wg.t).label
          : 'Bauantrag'
    );
    h += '</ul>';
    if (b.waits.length)
      h += `<p><button type="button" class="stb" data-sb="skip">⏩ bis ${esc(b.waits.slice().sort((x, y) => x.t - y.t)[0].text)}</button></p>`;
    if (VARIANT === 'B')
      h += `<div class="learn">Offene Frage der Variante B: Ins Obergeschoss mit Aufenthaltsraum verlangt die Bauordnung eine notwendige Treppe; Leitern sind nur zu Dachräumen ohne Aufenthaltsraum vorgesehen. Im vereinfachten Verfahren prüft das Bauamt das nicht – verantwortlich bleibt der Bauherr (oder er beantragt eine Abweichung). Quelle: § 37 Abs. 1 und Abs. 2 Satz 2 ThürBO vom 2. Juli 2024 (bis 2024 § 34); Planung Bauphase 22.</div>`;
    if (n > LAST()) return h + '<h4>Fertig</h4><div class="sub">Der Pavillon steht – alle Bauphasen gebaut.</div>';
    // the next phase as a project
    const p = phaseOf(n),
      M = meta(n),
      L = learnOf(n),
      k = costOf(n, 'kauf'),
      e = costOf(n, 'eigen'),
      kind = B.eigenKind(p),
      mat = matOf(n),
      o = b.order[n];
    h += `<h4>Nächste Bauphase ${n}: ${esc(p.name)}</h4><div class="sub">${esc(p.short)} · Aufwand ${esc(p.days)} zu zweit (${Math.round(B.personHours(p.days))} Personenstunden) · ${M.crew[0]}–${M.crew[1]} Leute, Bauen ab ${M.min}${M.hubert === 'need' ? ' · Hubert mit dem Traktor' : M.hubert === 'help' ? ' · Hubert hilft gern' : ''}</div>`;
    h += `<ul><li><span>Material gekauft</span><b>${eur(k.eur)}</b></li>`;
    if (kind)
      h += `<li><span>${kind === 'holz' ? 'mit eigenem Holz' : 'im Eigenbau'}${kind === 'holz' && (e.kant || e.brett) ? ` (${e.kant ? de(e.kant, 2) + ' m³ Kantholz S10' : ''}${e.kant && e.brett ? ', ' : ''}${e.brett ? de(e.brett, 2) + ' m³ Bretter' : ''} ≈ ${de((e.kant + e.brett) / YIELD, 1)} fm Rundholz)` : ''}</span><b>${eur(e.eur)}</b></li>`;
    h += '</ul>';
    if (kind && !o)
      h += `<p><button type="button" class="stb"${mat === 'kauf' ? ' aria-pressed="true"' : ''} data-sb="mat:kauf">Kaufen</button> <button type="button" class="stb"${mat === 'eigen' ? ' aria-pressed="true"' : ''} data-sb="mat:eigen">${kind === 'holz' ? 'Eigenes Holz' : 'Eigenbau'}</button></p>`;
    h += `<div class="sub">${o ? (o.due > now() ? 'Bestellt – Lieferung ' + W.day(o.due).label : 'Material liegt auf dem Bauplatz') + (o.eigen ? ' (Eigenleistung)' : '') : 'Material noch nicht bestellt'} · inkl. 19 % Umsatzsteuer</div>`;
    // how long with the smallest and the largest crew (working days of 8 h, a mean pace)
    const ph = B.personHours(p.days),
      dd = k => Math.max(0.5, Math.round((B.crewMinutes(ph, k) / 0.95 / 60 / 8) * 2) / 2);
    h += `<div class="sub">Dauer etwa ${de(dd(M.crew[1]), 1)}–${de(dd(M.crew[0]), 1)} Arbeitstage (${M.crew[1]} bis ${M.crew[0]} Leute)</div>`;
    // the money plan: how far the cash reaches with the chosen materials, and how long the rest takes at the monthly rate
    let sum = 0,
      upto = n - 1;
    for (let k = n; k <= LAST(); k++) {
      const c = b.order[k] ? 0 : costOf(k).eur;
      if (sum + c > S.eur) break;
      sum += c;
      upto = k;
    }
    let rest = 0;
    for (let k = n; k <= LAST(); k++) rest += b.order[k] ? 0 : costOf(k).eur;
    const gap = Math.max(0, rest - S.eur),
      months = b.konto.rate > 0 ? Math.ceil(gap / b.konto.rate) : null;
    const fc = forecast();
    if (fc)
      h += fc.stuck
        ? `<div class="sub">Was wäre, wenn: ohne Sparrate bleibt der Bau bei Phase ${fc.stuck} stehen.</div>`
        : `<div class="sub">Was wäre, wenn – so weiter (Wochenenden zu dritt, die Sparrate, Lieferzeiten, Wetter): fertig etwa <b>${esc(W.day(fc.t).label.replace(/^\w+ /, ''))}</b>; es bremst vor allem: ${fc.by}.</div>`;
    h += `<h4>Geldplan</h4><div class="sub">Noch offen bis zum fertigen Pavillon: <b>${eur(rest)}</b> (Material mit Umsatzsteuer, ohne Gerüst und Gebühren). Die Kasse reicht ${upto >= n ? 'bis Bauphase ' + upto : 'noch nicht für die nächste Phase'}${gap > 0 ? (months != null ? `; der Rest braucht bei ${eur(b.konto.rate)} im Monat gut ${months} Monate (${de(months / 12, 1)} Jahre).` : '; ohne Sparrate kommt nichts dazu.') : ' – bis zum Ende.'}</div>`;
    const wd = windowDays(n);
    h += `<h4>Wetterfenster</h4><div class="sub">${esc(B.wxText(M.inside ? null : M.wx))}</div><div class="sub">${wd.map(d => `<span title="${esc(d.why)}">${esc(d.label)} ${d.ok ? '✓' : '✗'}</span>`).join(' · ')}</div>`;
    if (L.text) h += `<div class="learn">${esc(L.text)}<br><small>Quelle: ${esc(L.src)}</small></div>`;
    return h;
  }
  // buttons of the panel (the core's panel handles its own; ours carry data-sb)
  let bound = null;
  function bindPanel() {
    const H = STRAT.ui && STRAT.ui.H;
    if (!H || !H.pan || bound === H.pan) return;
    bound = H.pan;
    H.pan.addEventListener('click', e => {
      const bt = e.target.closest('button[data-sb]');
      if (!bt) return;
      const [a, v] = bt.dataset.sb.split(':'),
        b = st();
      let r = null;
      if (a === 'begin') r = begin();
      else if (a === 'rate' || a === 'start') {
        const L = a === 'rate' ? B.KONTO.rates : B.KONTO.starts,
          i = L.indexOf(b.konto[a]);
        b.konto[a] = L[Math.max(0, Math.min(L.length - 1, i + (v === '+' ? 1 : -1)))];
      } else if (a === 'mat') b.mat[next()] = v === 'eigen' ? 'eigen' : 'kauf';
      else if (a === 'skip') {
        const w = b.waits.slice().sort((x, y) => x.t - y.t)[0];
        if (w) STRAT.skip(Math.max(1, Math.ceil(w.t - now()) + 5));
      }
      if (r && r.no) STRAT.note(r.text, { kind: 'nein' });
      else if (r && r.text) STRAT.note(r.text, { kind: 'bau' });
      STRAT.save();
      H.panH = '';
      if (H.panel) H.panel();
    });
  }
  // ---------------- the preparation as jobs ----------------
  const P = B.PREP;
  const desk = (j, id) => STRAT.pos(id).slice(0, 2);
  const money = (need, text) =>
    S.eur < need
      ? {
          no: true,
          text: `Nicht genug Geld: ${text} kostet ${eur(need)}.`,
          why: 'Erst die Baukasse anlegen oder auf die Sparrate warten.',
          src: B.KONTO.src,
        }
      : null;
  STRAT.job.define({
    id: 'bau_platte',
    label: P.platte.label,
    place: 'bauplatz',
    people: P.platte.people,
    skill: 'bauen',
    min: 1,
    heavy: 0.6,
    xp: 1.2,
    bau: true,
    order: 1,
    pose: 'chop',
    text: P.platte.text,
    learn: P.platte.learn + ' Quelle: ' + P.platte.src,
    show: () => !st().platte,
    dur: (j, cx) => B.crewMinutes(P.platte.hours * 2, j.who.length) / (0.8 + 0.1 * cx.skill),
    can: cx => {
      if (tempOf(cx.t) < -1)
        return { no: true, text: 'Der Boden ist gefroren – graben geht nicht.', why: B.WX_SRC.soil, src: B.TEMP_SRC };
      if (cx.wx.rain > 2) return { no: true, text: 'Starker Regen – die Grube läuft voll.', why: '', src: '' };
      return money(
        P.platte.cost.reduce((s, c) => s + c[1] * (1 + B.VAT), 0),
        'die Leihgeräte'
      );
    },
    start: j => {
      for (const c of P.platte.cost) bookBau(-c[1] * (1 + B.VAT), c[0]);
      j.d.paid = true;
    },
    finish: (j, cx) => {
      const b = st();
      if (!b.seed) b.seed = Math.floor(Math.random() * 1e9) | 0 || 7;
      if (b.ph == null) b.ph = PHASE;
      const f = findSlab(),
        ok = B.slabOk(f);
      b.platte = Object.assign(f, { ok, t: Math.round(cx.t) });
      STRAT.reveal('bau', 'platte', b.platte, j.who[0], {
        title: `Die Garagenplatte: ${f.thick} cm, ${f.rebar ? 'bewehrt' : 'unbewehrt'}, Frostschürze ${f.apron ? f.apron + ' cm' : 'keine'}`,
        source:
          'Freigelegt und gemessen von ' +
          names(j.who) +
          ' (im Spiel ausgewürfelt – die echte Platte zeigt erst das Freilegen)',
        text: ok ? 'sie trägt den Pavillon' : 'sie braucht am Rand ein Streifenfundament',
      });
      STRAT.emit('bau', { what: 'platte', ok });
      return { text: ok ? 'die Platte trägt' : 'Streifenfundament nötig' };
    },
  });
  STRAT.job.define({
    id: 'bau_streifen',
    label: P.streifen.label,
    place: 'bauplatz',
    people: P.streifen.people,
    skill: 'bauen',
    min: 2,
    heavy: 0.9,
    xp: 1.5,
    loud: true,
    bau: true,
    order: 2,
    pose: 'chop',
    text: P.streifen.text,
    learn: P.streifen.learn + ' Quelle: ' + P.streifen.src,
    show: () => {
      const b = st();
      return !!b.platte && !B.slabOk(b.platte) && !b.streifen;
    },
    dur: (j, cx) => B.crewMinutes(P.streifen.hours, j.who.length) / (0.8 + 0.08 * cx.skill),
    can: cx => {
      if (tempOf(cx.t) < 5)
        return {
          no: true,
          text: `Zu kalt zum Betonieren (${Math.round(tempOf(cx.t))} °C).`,
          why: P.streifen.learn,
          src: P.streifen.src,
        };
      if (cx.wx.rain > 1) return { no: true, text: 'Zu nass zum Betonieren.', why: '', src: '' };
      if (!(cx.job && cx.job.d.paid))
        return money(
          P.streifen.cost.reduce((s, c) => s + c[1], 0),
          'das Fundament'
        );
      return null;
    },
    start: j => {
      if (!j.d.paid) for (const c of P.streifen.cost) bookBau(-c[1], c[0]);
      j.d.paid = true;
    },
    finish: () => {
      st().streifen = true;
      STRAT.emit('bau', { what: 'streifen' });
      return { text: 'die Platte steht jetzt auf einem Streifenfundament' };
    },
  });
  STRAT.job.define({
    id: 'bau_voranfrage',
    label: P.voranfrage.label,
    place: 'bauamt',
    people: P.voranfrage.people,
    skill: 'reden',
    min: 2,
    heavy: 0.1,
    order: 3,
    text: P.voranfrage.text,
    learn: P.voranfrage.learn + ' Quelle: ' + P.voranfrage.src,
    show: () => !st().vb && !waiting('vb'),
    hours: [8 * 60, 16 * 60],
    dur: P.voranfrage.hours * 60,
    can: cx => {
      if (cx.day.wd === 0 || cx.day.wd === 6 || cx.day.hol)
        return {
          no: true,
          text: 'Das Landratsamt hat heute zu.',
          why: 'Behörden haben werktags Sprechzeiten – also ein Urlaubstag unter der Woche.',
          src: 'Landratsamt Hildburghausen',
        };
      return money(P.voranfrage.fee, 'der Vorbescheid');
    },
    finish: () => {
      bookBau(-P.voranfrage.fee, 'Gebühr Bauvoranfrage');
      const w = waitFor('vb', P.voranfrage.wait, 'Vorbescheid');
      return { text: 'Antwort etwa ' + W.day(w.t).label + ' (' + P.voranfrage.waitSrc + ')' };
    },
  });
  STRAT.job.define({
    id: 'bau_statik',
    label: P.statik.label,
    place: 'bauplatz',
    spot: desk,
    people: P.statik.people,
    skill: 'bauen',
    min: 2,
    heavy: 0.05,
    order: 4,
    text: P.statik.text,
    learn: P.statik.learn + ' Quelle: ' + P.statik.src,
    show: () => !st().statik && !waiting('statik'),
    anytime: true,
    dur: P.statik.hours * 60,
    can: () => {
      if (!st().platte)
        return {
          no: true,
          text: 'Erst die Platte freilegen und messen – der Tragwerksplaner braucht die Befunde.',
          why: 'Die Statik rechnet mit Dicke, Bewehrung und Frostschürze der Platte; geraten wird nicht.',
          src: P.statik.src,
        };
      return money(P.statik.fee, 'die Statik');
    },
    finish: () => {
      bookBau(-P.statik.fee, 'Tragwerksplanung (Statik)');
      const w = waitFor('statik', P.statik.wait, 'Statik');
      return { text: 'Statik fertig etwa ' + W.day(w.t).label + ' (' + P.statik.waitSrc + ')' };
    },
  });
  const permitFee = () =>
    P.antrag.fee + Math.round(P.antrag.feeRate * PHASES.reduce((s, p) => s + B.phaseCost(p, false).eur, 0));
  STRAT.job.define({
    id: 'bau_antrag',
    label: P.antrag.label,
    place: 'bauamt',
    people: P.antrag.people,
    skill: 'reden',
    min: 2,
    heavy: 0.1,
    order: 5,
    text: P.antrag.text,
    learn: P.antrag.learn + ' Quelle: ' + P.antrag.src,
    show: () => {
      const b = st();
      return !b.gen && !waiting('gen');
    },
    hours: [8 * 60, 16 * 60],
    dur: P.antrag.hours * 60,
    can: cx => {
      const b = st();
      if (!b.vb || !b.statik)
        return {
          no: true,
          text:
            'Für den Bauantrag fehlen ' +
            [!b.vb && 'der Vorbescheid', !b.statik && 'die Statik'].filter(Boolean).join(' und ') +
            '.',
          why: 'Zu den Bauvorlagen gehören Lageplan, Bauzeichnungen, Baubeschreibung und der Standsicherheitsnachweis.',
          src: P.antrag.src,
        };
      if (cx.day.wd === 0 || cx.day.wd === 6 || cx.day.hol)
        return {
          no: true,
          text: 'Das Landratsamt hat heute zu.',
          why: 'Behörden haben werktags Sprechzeiten.',
          src: 'Landratsamt Hildburghausen',
        };
      return money(permitFee(), 'Bauvorlagen und Gebühr');
    },
    finish: () => {
      bookBau(-P.antrag.fee, 'Bauvorlagen (Entwurfsverfasser)');
      bookBau(-(permitFee() - P.antrag.fee), 'Gebühr Baugenehmigung');
      const w = waitFor('gen', P.antrag.wait, 'Baugenehmigung');
      return { text: 'Bescheid etwa ' + W.day(w.t).label + ' (' + P.antrag.waitSrc + ')' };
    },
  });
  STRAT.job.define({
    id: 'bau_geruest',
    label: P.geruest.label,
    place: 'bauplatz',
    people: P.geruest.people,
    skill: 'bauen',
    min: 1,
    heavy: 0.3,
    order: 6,
    text: P.geruest.text,
    learn: P.geruest.learn + ' Quelle: ' + P.geruest.src,
    show: () => {
      const b = st(),
        n = next();
      return b.started && n >= P.geruest.from - 1 && n <= P.geruest.to && !(b.geruest && !b.geruest.off);
    },
    dur: P.geruest.hours * 60,
    can: () => money(P.geruest.fee, 'das Gerüst'),
    finish: (j, cx) => {
      bookBau(-P.geruest.fee, 'Gerüst: Auf- und Abbau, acht Wochen Miete');
      st().geruest = { t: Math.round(cx.t), weeks: 0 };
      return { text: 'das Gerüst steht' };
    },
  });
  // ---------------- material: order the next phases' material (delivery days; windows take weeks) ----------------
  const leadOf = (n, eigen) => {
    const M = meta(n);
    if (VARIANT === 'B' && M.leadB) return M.leadB;
    return (eigen ? M.leadEigen : M.lead) || B.LEAD;
  };
  // the phase whose material is ordered next: the next one without an order, looking two phases ahead
  const orderTarget = () => {
    const b = st(),
      n = next();
    for (let k = Math.max(1, n); k <= Math.min(LAST(), n + 2); k++) if (!b.order[k]) return k;
    return null;
  };
  STRAT.job.define({
    id: 'bau_bestellen',
    label: 'Material bestellen',
    place: 'bauplatz',
    spot: desk,
    people: [1, 1],
    skill: 'reden',
    min: 1,
    heavy: 0,
    order: 7,
    text: 'Beim Baustoff- und Holzhandel bestellen: Lieferung frei Baustelle mit Kran.',
    learn: B.LEAD_SRC + '. Gekaufte Fenster, Türen und Treppen brauchen Wochen – früh bestellen.',
    show: () => st().started && orderTarget() != null,
    anytime: true,
    dur: 25,
    init: j => {
      j.d.n = orderTarget();
    },
    can: cx => {
      const n = cx.job && cx.job.d.n != null ? cx.job.d.n : orderTarget();
      if (n == null) return { no: true, text: 'Gerade ist nichts zu bestellen.', why: '', src: '' };
      const c = costOf(n);
      return money(c.eur, `Das Material für Phase ${n}`);
    },
    finish: (j, cx) => {
      const n = j.d.n != null ? j.d.n : orderTarget(),
        b = st();
      if (n == null) return { text: 'nichts zu bestellen' };
      const m = matOf(n),
        c = costOf(n, m),
        days = leadOf(n, m === 'eigen');
      bookBau(-c.eur, `Material Bauphase ${n}: ${phaseOf(n).name}${m === 'eigen' ? ' (mit Eigenleistung)' : ''}`);
      b.order[n] = { t: Math.round(cx.t), due: Math.round(cx.t + days * 1440), eur: c.eur, eigen: m === 'eigen' };
      waitFor('lief:' + n, days, 'Lieferung Phase ' + n);
      return { text: `Phase ${n}: ${eur(c.eur)}, Lieferung ${W.day(b.order[n].due).label}` };
    },
  });
  // ---------------- own timber: grading the dry planks ----------------
  STRAT.job.define({
    id: 'bau_sortieren',
    label: P.sortieren.label,
    place: 'holzlager',
    people: P.sortieren.people,
    skill: 'holz',
    min: 1,
    heavy: 0.3,
    order: 45,
    text: P.sortieren.text,
    learn: P.sortieren.learn + ' Quelle: ' + P.sortieren.src,
    show: () => st().started,
    dur: () => 30 + 3 * dryStack(true).length,
    can: cx => {
      if (!dryStack(true).length && !(cx.job && cx.job.d.started)) {
        const wet = (HOLZSAW.boards || []).filter(b => b.st === 'stack' && b.t >= 0.045).length;
        return {
          no: true,
          text: wet
            ? `${wet} Bohlen liegen im Stapel, aber noch nicht unter 20 % Holzfeuchte.`
            : 'Keine trockenen Bohlen im Stapel – erst sägen (52 mm) und trocknen.',
          why: B.BOOK.why.bau_holz.text,
          src: P.sortieren.src,
        };
      }
      return cx.job && cx.job.d.started ? null : money(P.sortieren.fee, 'der Sortierer');
    },
    start: j => {
      j.d.started = true;
      bookBau(-P.sortieren.fee, 'Holzsortierer (DIN 4074-1), ein Tag');
    },
    finish: () => {
      const b = st(),
        L = dryStack(true);
      let ok = 0,
        blue = 0,
        m3 = 0;
      for (const x of L) {
        const hash = ((x.id | 0) * 2654435761) >>> 0;
        if (x.warp || x.crack || hash % 100 >= 78) continue;
        x.st = 'used';
        x.bau = 'S10';
        ok++;
        if (x.blue) blue++;
        m3 += vol(x) * 0.88;
      }
      b.kvh = +(b.kvh + m3).toFixed(3);
      try {
        HOLZDRY.rebuild();
        HOLZ.save();
      } catch (e) {}
      if (ok) learnt('h_sortieren', 'tun:eigenes Bauholz nach DIN 4074 sortiert');
      markDirty(true);
      return {
        text: `${ok} von ${L.length} Bohlen sind S10 (C24): ${de(m3, 2)} m³ Bauholz${blue ? ` – ${blue} davon mit Bläue, die zählt nicht` : ''}`,
      };
    },
  });
  // ---------------- the phases as jobs (one per phase; only the next one shows) ----------------
  function phaseCan(n, cx) {
    const b = st(),
      M = meta(n);
    if (built() !== n - 1) return { no: true, text: `Erst Bauphase ${n - 1}.`, why: '', src: '' };
    if (!b.gen) {
      return {
        no: true,
        text: 'Ohne Baugenehmigung wird nicht gebaut.',
        why: B.BOOK.why.bau_genehmigung.text,
        src:
          '§ 63 Abs. 1 Nr. 1 Buchst. a und b ThürBO (verfahrensfrei nur „außer im Außenbereich“); Einstellung, Beseitigung, Bußgeld nach der Bauordnung (wie §§ 79, 80, 84 MBO); ' +
          B.LAW.thuerbo,
      };
    }
    if (cx.t < b.gen.start)
      return {
        no: true,
        text: 'Baubeginn erst ab ' + W.day(b.gen.start).label + '.',
        why: B.BOOK.why.bau_baubeginn.text,
        src: B.PREP.antrag.src,
      };
    if (n >= 2 && b.platte && !B.slabOk(b.platte) && !b.streifen)
      return {
        no: true,
        text: 'Die Platte trägt so nicht – erst das Streifenfundament.',
        why: 'Dünne oder unbewehrte Platten ohne Frostschürze reißen unter den Linienlasten der Wände; ein Streifenfundament am Rand trägt sie frostfrei.',
        src: B.PREP.platte.src,
      };
    if (n >= P.geruest.from && n <= P.geruest.to && !(b.geruest && !b.geruest.off))
      return {
        no: true,
        text: 'Ohne Gerüst kein Obergeschoss und kein Dach.',
        why: P.geruest.learn,
        src: P.geruest.src,
      };
    const o = b.order[n];
    if (!o && !(cx.job && cx.job.d.took))
      return { no: true, text: `Das Material für Phase ${n} ist nicht bestellt.`, why: B.LEAD_SRC, src: '' };
    if (o && o.due > cx.t)
      return { no: true, text: 'Das Material kommt erst ' + W.day(o.due).label + '.', why: B.LEAD_SRC, src: '' };
    if (n === 28 && b.dryUntil > cx.t)
      return {
        no: true,
        text: 'Der Lehmputz trocknet noch bis ' + W.day(b.dryUntil).label + '.',
        why: learnOf(27).text,
        src: learnOf(27).src,
      };
    if (M.hubert === 'need' && !cx.who.includes('hubert'))
      return {
        no: true,
        text: 'Dafür braucht es Hubert mit dem Traktor.',
        why: 'Die Dachteile der Garage sind lang und schwer – sein Frontlader trägt sie ans Südende.',
        src: learnOf(n).src,
      };
    const w = B.wxFail(M.wx, wxAt(cx.t), M.inside);
    if (w)
      return {
        no: true,
        rule: 'wetter',
        text: 'Kein Wetter dafür: ' + w.text + '.',
        why: B.WX_SRC[w.k] || '',
        src: 'Wetterfenster der Bauphase · ' + (cx.wx.src || ''),
      };
    // own timber: there before the work starts (it is taken when the phase begins)
    if (o && o.eigen && !(cx.job && cx.job.d.took) && B.eigenKind(phaseOf(n)) === 'holz') {
      const c = costOf(n, 'eigen');
      if (b.kvh < c.kant - 1e-6 || sumVol(dryStack(false)) < c.brett - 1e-6)
        return {
          no: true,
          text: `Zu wenig eigenes Bauholz: ${de(b.kvh, 2)} von ${de(c.kant, 2)} m³ Kantholz S10, ${de(sumVol(dryStack(false)), 2)} von ${de(c.brett, 2)} m³ trockene Bretter.`,
          why: 'Eigenes Holz muss gefällt, gesägt, unter 20 % getrocknet und – wenn es trägt – nach DIN 4074 sortiert sein.',
          src: P.sortieren.src,
        };
    }
    return null;
  }
  for (let n = 1; n <= 30; n++)
    STRAT.job.define({
      id: 'bau' + n,
      label: `Bauphase ${n}: ${phaseOf(n) ? phaseOf(n).name : ''}`,
      place: 'bauplatz',
      people: meta(n).crew,
      skill: 'bauen',
      min: meta(n).min,
      heavy: meta(n).heavy,
      // outside, building is publicly noticeable work – not on Sundays and holidays, not at night (inside work only if loud)
      loud: !!meta(n).loud || !meta(n).inside,
      where: 'dorf',
      xp: 1.5,
      bau: true,
      order: 10 + n / 100,
      pose: meta(n).inside ? 'bench' : 'place',
      text: phaseOf(n) ? phaseOf(n).how[0] : '',
      learn: learnOf(n).text + ' Quelle: ' + learnOf(n).src,
      favour: 1,
      show: () => next() === n && st().started,
      dur: (j, cx) => B.crewMinutes(B.personHours(phaseOf(n).days), j.who.length) / (0.75 + 0.08 * cx.skill),
      speed: (j, cx) => (meta(n).hubert === 'help' && cx.who.includes('hubert') ? 1.15 : 1),
      // south of the slab (the core spreads the crew around this spot)
      spot: () => [2.0, -0.7],
      can: cx => phaseCan(n, cx),
      start: (j, cx) => {
        const b = st(),
          o = b.order[n];
        // own timber goes from the stores into the building now (the graded timber, the dry boards out of the stack)
        if (o && o.eigen && B.eigenKind(phaseOf(n)) === 'holz' && !j.d.took) {
          const c = costOf(n, 'eigen');
          b.kvh = Math.max(0, +(b.kvh - c.kant).toFixed(3));
          if (c.brett > 0) useBoards(c.brett, 'phase' + n);
        }
        j.d.took = true;
        void cx;
      },
      finish: (j, cx) => {
        const b = st();
        b.ph = n;
        setPhase(n);
        if (meta(n).fee) for (const f of meta(n).fee) bookBau(-f[1], f[0]);
        if (n === 27) b.dryUntil = Math.round(cx.t + (meta(27).dry || 14) * 1440);
        if (n === P.geruest.to && b.geruest) {
          b.geruest.off = true;
          STRAT.note('Das Gerüst wird abgebaut – die Miete endet.', { kind: 'bau' });
        }
        const L = learnOf(n);
        STRAT.note(`Bauphase ${n} fertig: ${phaseOf(n).name}. ${phaseOf(n).short}.`, {
          kind: 'bau',
          why: L.text,
          src: L.src,
        });
        STRAT.emit('bau', { what: 'phase', ph: n });
        STRAT.save();
        markDirty(true);
        return { text: `die Welt steht jetzt in Bauphase ${n}` };
      },
    });
  // labels follow the variant (pavilion/variant.js mutates PHASES in place)
  let labVar = VARIANT;
  KERN.tick(() => {
    if (labVar === VARIANT) return;
    labVar = VARIANT;
    for (let n = 1; n <= 30; n++) {
      const J = STRAT.job.get('bau' + n);
      if (!J || !phaseOf(n)) continue;
      J.label = `Bauphase ${n}: ${phaseOf(n).name}`;
      J.text = phaseOf(n).how[0];
      J.learn = learnOf(n).text + ' Quelle: ' + learnOf(n).src;
    }
  }, 'strategie/bau-variante');
  // ---------------- chapter 3: the pavilion; the ages of the phases ----------------
  STRAT.chapter.define({
    id: 'k3',
    order: 3,
    title: 'Kapitel 3 · Der Pavillon',
    text: 'Platte prüfen, Bauamt, Statik, Genehmigung – dann Bauphase für Bauphase, mit eigenem Holz, Helfern und dem Wetter.',
  });
  STRAT.chapter.goal('k3', {
    id: 'platte',
    text: 'Die Garagenplatte prüfen',
    check: () => !!(S.ext.bau && S.ext.bau.platte),
  });
  STRAT.chapter.goal('k3', {
    id: 'genehmigt',
    text: 'Die Baugenehmigung',
    check: () => !!(S.ext.bau && S.ext.bau.gen),
  });
  STRAT.chapter.goal('k3', {
    id: 'garage',
    text: 'Bauphase 1: die Garage ans Südende',
    check: () => !!(S.ext.bau && S.ext.bau.ph >= 1),
  });
  STRAT.chapter.goal('k3', {
    id: 'dicht',
    text: 'Unter Dach (Bauphase 16)',
    check: () => !!(S.ext.bau && S.ext.bau.ph >= 16),
  });
  STRAT.chapter.goal('k3', {
    id: 'fertig',
    text: 'Der Pavillon steht (Bauphase 30)',
    check: () => !!(S.ext.bau && S.ext.bau.ph >= 30),
  });
  for (const a of B.AGES) if (!D.AGES.some(g => g.from === a.from)) D.AGES.push(a);
  D.AGES.sort((a, b) => a.from - b.from);
  // ---------------- a layer: the building site (what is next, what it waits for) ----------------
  STRAT.layer.define({
    id: 'bau',
    label: 'Bauen',
    text: 'Der Bauplatz: nächste Bauphase, Lieferungen, Bescheide',
    order: 9,
    draw: pr => {
      const n = next();
      // only close up (from about 80 m of view height): further out the place's badge says it
      if (n > LAST() || VIEWP.th > 80) return '';
      const q = pr(2.0, 2.0, 0.2),
        p = phaseOf(n);
      if (!(q[2] < 1)) return '';
      const miss = missingFor(n);
      return `<text class="wx" x="${q[0].toFixed(1)}" y="${(q[1] + 26).toFixed(1)}" text-anchor="middle">${esc('Phase ' + n + ': ' + p.name)}${miss.length ? ' · ' + esc(miss[0]) : ''}</text>`;
    },
  });
  // ---------------- the API ----------------
  const api = {
    st,
    built,
    next,
    begin,
    costOf,
    matOf,
    meta,
    learnOf,
    missingFor,
    windowDays,
    wxAt,
    tempOf,
    waiting,
    resolve,
    permitFee,
    dryStack,
    useBoards,
    orderTarget,
    forecast,
    book,
    learnt,
    sign: () => SIGN.g,
    pile: () => PILE.g,
    set forcePlatte(v) {
      forcePlatte = v;
    },
    get forcePlatte() {
      return forcePlatte;
    },
    D: B,
  };
  STRAT.onLoad.push(() => st());
  KERN.on('reset', () => {
    applied = true;
  });
  return api;
})();
window.STBAU = STBAU;
