// ===================== ton-radio: the files of the sound repository (GLMEDIEN) – songs, score, beds, effects =====================
// Falko, 13.11.2026 23:02: „Das Radio klingt wirklich wie ein Kinderradio. Das müssen echte coole Songs sein.“ – ~23:20: free music of real
// bands (CC0 / CC BY), no AI music. The files live in a repository of their own (mynametouse/pavillon-ton with GitHub Pages, the same origin
// as the game, so WebAudio may process them); its index.json lists everything (agent ton-musik). Every sound module of the mode reads it here:
//   GLMEDIEN.BASE            the repository's base URL (one constant; a test may set it – the caches follow it)
//   index()                  → Promise of index.json (fetched once per BASE; null when the repository is not reachable – never rejects)
//   liste(f)                 the normalised entries (f: { kind, sender, schicht, zone, … } or a function) without those switched off (aus)
//   eintrag(id) · url(id)    one entry (normalised, its own fields kept) · its file's URL
//   buffer(id | { url })     → Promise<AudioBuffer | null>, decoded once, kept in a small LRU (≤ 6 buffers, ≤ 40 MB) – for short things
//   stream(id | { url }, dest, { ab, loop })  → { el, node, stop(), ende } – a media element through a MediaElementSource into dest (songs,
//                            long beds: they stream, they are not decoded whole); the elements are a small pool, each with its source node
//                            made once, reused – one plays while another preloads the next (vorlade)
//   vorlade(id | { url })    the next file into a free element of the pool · wecken() lets the pool play on a phone (on a tap; done by itself)
//   da()                     → Promise<boolean>: is the repository reachable · stand() → 'laedt' | 'ok' | 'aus' | '' (synchronous)
// Without the repository, a file or a connection everything resolves to null/false quietly – the callers fall back to what plays today
// (the synthesised pieces and score, the Edge voices); nothing shows on screen. Nothing is fetched before a module asks for it.
// Pure parts for node (no imports; the audio graph comes from GLTON.raw() at run time): norm(), LRU(), neu() (tests).
export const GLMEDIEN = (() => {
  const W = typeof window !== 'undefined' ? window : null;
  const DEF = 'https://mynametouse.github.io/pavillon-ton/';
  // the default base: the same origin on GitHub Pages (the game and the repository are both under mynametouse.github.io), else the
  // absolute URL; an override for testing on one's own machine: localStorage 'pav-ton-basis'
  function grund() {
    try {
      const o = W && W.localStorage && W.localStorage.getItem('pav-ton-basis');
      if (o && /^(https?:\/\/|\/|\.\.?\/)/i.test(o)) return o.endsWith('/') ? o : o + '/';
    } catch (e) {}
    try {
      if (W && /\.github\.io$/i.test(W.location.hostname)) return W.location.origin + '/pavillon-ton/';
    } catch (e) {}
    return DEF;
  }

  // ---------------- index.json: whatever its shape, one list of entries with the shared field names ----------------
  // (the pipeline writes the fields of docs/plans/auftraege/ton-gemeinsam.md; the German names of the manifests are read as well)
  const num = v =>
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && v.trim() && Number.isFinite(+v)
        ? +v
        : undefined;
  const txt = (...v) => {
    for (const x of v) if (typeof x === 'string' && x.trim()) return x.trim();
    return '';
  };
  // a licence string as it is shown: „CC BY 4.0“, „CC0“, „Public Domain“
  function lizenz(s, u) {
    const t = txt(s),
      url = txt(u).toLowerCase();
    if (/zero|cc0/i.test(t) || /publicdomain\/zero/.test(url)) return 'CC0';
    if (/public\s*domain|gemeinfrei|pdm/i.test(t) || /publicdomain\/mark/.test(url)) return 'Public Domain';
    const m = (t + ' ' + url).match(/by[-\s/]*(\d\.\d)/i);
    if (/\bby\b/i.test(t) || /licenses\/by\//.test(url)) return 'CC BY' + (m ? ' ' + m[1] : '');
    return t;
  }
  function eins(r, k) {
    if (!r || typeof r !== 'object') return null;
    const id = txt(r.id, k);
    const file = txt(r.file, r.datei, r.path, r.pfad);
    if (!id || !file) return null;
    const e = Object.assign({}, r);
    e.id = id;
    e.kind = txt(r.kind, r.art, r.typ);
    e.file = file;
    e.title = txt(r.title, r.titel, r.name);
    e.author = txt(r.author, r.interpret, r.artist, r.urheber, r.von);
    e.licence_url = txt(r.licence_url, r.license_url, r.lizenz_url, r.lizenzUrl);
    e.licence = lizenz(txt(r.licence, r.license, r.lizenz), e.licence_url);
    e.source = txt(r.source, r.quelle, r.page, r.seite);
    e.sec = num(r.sec) !== undefined ? num(r.sec) : num(r.sek) !== undefined ? num(r.sek) : num(r.dauer);
    e.gesang_ab = num(r.gesang_ab);
    e.gesang_bis = num(r.gesang_bis);
    e.bett = num(r.bett);
    e.sender = txt(r.sender);
    e.schicht = txt(r.schicht, r.layer);
    e.aus = r.aus === true;
    e.loop = r.loop === true;
    return e;
  }
  function norm(j) {
    let raw = [];
    if (Array.isArray(j)) raw = j.map(r => [r, '']);
    else if (j && typeof j === 'object') {
      const arr = ['eintraege', 'items', 'entries', 'liste', 'files', 'dateien', 'alle']
        .map(k => j[k])
        .find(Array.isArray);
      if (arr) raw = arr.map(r => [r, '']);
      else
        raw = Object.entries(j)
          .filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
          .map(([k, v]) => [v, k]);
    }
    const out = [],
      seen = new Set();
    for (const [r, k] of raw) {
      const e = eins(r, k);
      if (e && !seen.has(e.id)) {
        seen.add(e.id);
        out.push(e);
      }
    }
    return out;
  }

  // ---------------- a small LRU of decoded buffers: at most n entries and so many bytes ----------------
  function LRU(maxN = 6, maxBytes = 40 * 1024 * 1024) {
    const m = new Map();
    let bytes = 0;
    const L = {
      maxN,
      maxBytes,
      get(k) {
        if (!m.has(k)) return undefined;
        const v = m.get(k);
        m.delete(k);
        m.set(k, v);
        return v.v;
      },
      has: k => m.has(k),
      set(k, v, b) {
        if (m.has(k)) {
          bytes -= m.get(k).b;
          m.delete(k);
        }
        b = Math.max(0, b | 0);
        m.set(k, { v, b });
        bytes += b;
        // the oldest go first; the newest stays even when it alone is over the limit
        for (const [q, x] of m) {
          if (m.size <= 1 || (m.size <= L.maxN && bytes <= L.maxBytes)) break;
          if (q === k) continue;
          m.delete(q);
          bytes -= x.b;
        }
        return v;
      },
      del(k) {
        if (!m.has(k)) return;
        bytes -= m.get(k).b;
        m.delete(k);
      },
      clear() {
        m.clear();
        bytes = 0;
      },
      keys: () => [...m.keys()],
      get size() {
        return m.size;
      },
      get bytes() {
        return bytes;
      },
    };
    return L;
  }

  // ---------------- state ----------------
  const M = { BASE: grund() };
  const S = {
    base: '',
    idx: null, // the Promise of index.json for S.base
    roh: null,
    list: [],
    by: {},
    st: '', // '' | 'laedt' | 'ok' | 'aus'
    bufs: LRU(6, 40 * 1024 * 1024),
    wait: new Map(), // url → Promise of a buffer being fetched
    pool: [], // { el, node, ctx, frei, url, vor, wach }
    holt: 0, // fetches made (tests)
    fehler: 0,
    hand: false, // the gesture listener is in place
  };
  const MAXEL = 6;
  const raw = () => {
    try {
      const G = W && W.GLTON;
      return G && G.raw ? G.raw() : null;
    } catch (e) {
      return null;
    }
  };
  function reset() {
    S.base = M.BASE;
    S.idx = null;
    S.roh = null;
    S.list = [];
    S.by = {};
    S.st = '';
    S.bufs.clear();
    S.wait.clear();
  }
  const absolut = u => {
    try {
      return new URL(u, W ? W.location.href : 'http://x/').href;
    } catch (e) {
      return u;
    }
  };
  function hole(u, ms, art) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    S.holt++;
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null,
      t = ac ? setTimeout(() => ac.abort(), ms) : 0;
    return fetch(u, ac ? { signal: ac.signal } : {})
      .then(r => (r && r.ok ? (art === 'json' ? r.json() : r.arrayBuffer()) : null))
      .catch(() => null)
      .finally(() => clearTimeout(t));
  }
  function index() {
    if (S.base !== M.BASE) reset();
    if (S.idx) return S.idx;
    const base = (S.base = M.BASE);
    S.st = 'laedt';
    hand();
    S.idx = hole(base + 'index.json', 9000, 'json').then(j => {
      if (S.base !== base) return null;
      const L = j ? norm(j) : [];
      S.roh = j || null;
      S.list = L;
      S.by = {};
      for (const e of L) S.by[e.id] = e;
      S.st = L.length ? 'ok' : 'aus';
      if (W && W.KERN && W.KERN.emit) W.KERN.emit('grenzland:medien', { ok: S.st === 'ok', n: L.length });
      return L.length ? j : null;
    });
    return S.idx;
  }
  const da = () => index().then(() => S.st === 'ok');
  const stand = () => (S.base === M.BASE ? S.st : '');
  const eintrag = id => (S.base === M.BASE && S.by[id]) || null;
  function liste(f) {
    if (S.base !== M.BASE) return [];
    const ok = typeof f === 'function' ? f : e => !f || Object.keys(f).every(k => e[k] === f[k]);
    return S.list.filter(e => !e.aus && ok(e));
  }
  function url(id) {
    if (id && typeof id === 'object') return id.url || null;
    const e = eintrag(id);
    if (!e) return null;
    return /^(https?:|data:|blob:|\/)/i.test(e.file) ? e.file : M.BASE + e.file.replace(/^\.?\//, '');
  }

  // ---------------- decoded buffers (short things: idents, stings, a bed) ----------------
  function buffer(id) {
    if (id && typeof id !== 'object' && S.st !== 'ok' && S.base === M.BASE && S.st !== 'aus')
      return index().then(() => buffer(id));
    if (id && typeof id !== 'object' && S.base !== M.BASE) return index().then(() => buffer(id));
    const u = url(id);
    if (!u) return Promise.resolve(null);
    const have = S.bufs.get(u);
    if (have) return Promise.resolve(have);
    if (S.wait.has(u)) return S.wait.get(u);
    const R = raw();
    if (!R || !R.ctx) return Promise.resolve(null);
    const p = hole(u, 20000, 'bin')
      .then(
        ab =>
          ab &&
          new Promise(res => {
            try {
              const q = R.ctx.decodeAudioData(ab, res, () => res(null));
              if (q && q.catch) q.catch(() => res(null));
            } catch (e) {
              res(null);
            }
          })
      )
      .then(b => {
        S.wait.delete(u);
        if (!b) {
          S.fehler++;
          return null;
        }
        S.bufs.set(u, b, b.length * b.numberOfChannels * 4);
        return b;
      })
      .catch(() => {
        S.wait.delete(u);
        return null;
      });
    S.wait.set(u, p);
    return p;
  }

  // ---------------- the pool of media elements (songs stream) ----------------
  // (a MediaElementSource can be made once per element: every element keeps its node; on a phone an element plays only after it was
  // started once inside a tap – wecken() does that for the whole pool on the first tap after the pool exists)
  // (20 ms of silence, 8 kHz mono WAV)
  const STILL =
    'data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAB' + 'A'.repeat(430) + '==';
  function neuEl(R) {
    if (!W || typeof W.Audio !== 'function' || S.pool.length >= MAXEL) return null;
    try {
      const el = new W.Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      el.setAttribute('playsinline', '');
      const node = R.ctx.createMediaElementSource(el);
      const p = { el, node, ctx: R.ctx, frei: true, url: '', vor: '', wach: false, dest: null, h: null };
      el.addEventListener('ended', () => p.h && p.h._ende(true));
      el.addEventListener('error', () => {
        if (p.el.src === STILL) return;
        S.fehler++;
        if (p.h) p.h._ende(false);
        if (p.vor) p.vor = '';
      });
      S.pool.push(p);
      return p;
    } catch (e) {
      return null;
    }
  }
  function wecken() {
    if (!S.pool.length) {
      const R = raw();
      if (R && R.ctx) {
        neuEl(R);
        neuEl(R);
      }
    }
    for (const p of S.pool) {
      if (p.wach || !p.frei) continue;
      try {
        if (!p.el.getAttribute('src')) {
          p.el.src = STILL;
          const q = p.el.play();
          if (q && q.then)
            q.then(
              () => {
                p.wach = true;
                try {
                  if (p.el.src === STILL && p.frei) p.el.pause();
                } catch (e) {}
              },
              () => {}
            );
        } else p.el.load();
      } catch (e) {}
    }
  }
  function hand() {
    if (S.hand || !W || !W.addEventListener) return;
    S.hand = true;
    const f = () => wecken();
    for (const ev of ['pointerdown', 'touchend', 'keydown'])
      W.addEventListener(ev, f, { capture: true, passive: true });
  }
  function frei(R, u) {
    const ok = q => q.frei && q.ctx === R.ctx;
    return (
      S.pool.find(q => ok(q) && u && q.vor === u) ||
      S.pool.find(q => ok(q) && !q.vor) ||
      S.pool.find(q => ok(q)) ||
      neuEl(R)
    );
  }
  function vorlade(id) {
    const R = raw(),
      u = url(id);
    if (!R || !u) return false;
    const a = absolut(u);
    if (S.pool.some(q => q.vor === a || (!q.frei && q.url === a))) return true;
    // (keep one element free for what comes now)
    if (S.pool.filter(q => q.frei && q.ctx === R.ctx).length < 2 && S.pool.length >= MAXEL - 1) return false;
    const p = frei(R, '');
    if (!p) return false;
    try {
      p.vor = a;
      p.el.src = u;
      p.el.load();
      return true;
    } catch (e) {
      p.vor = '';
      return false;
    }
  }
  function stream(id, dest, o = {}) {
    const R = raw(),
      u = url(id);
    if (!R || !u || !dest) return null;
    hand();
    const a = absolut(u),
      p = frei(R, a);
    if (!p) return null;
    p.frei = false;
    let fertig = null;
    const h = {
      el: p.el,
      node: p.node,
      url: a,
      id: typeof id === 'string' ? id : '',
      ok: true,
      aus: false,
      ende: new Promise(res => (fertig = res)),
      _ende(ok) {
        if (h.aus) return;
        h.ok = h.ok && ok;
        fertig(ok);
      },
      stop() {
        if (h.aus) return;
        h.aus = true;
        fertig(h.ok);
        try {
          p.el.pause();
        } catch (e) {}
        try {
          p.node.disconnect();
        } catch (e) {}
        p.h = null;
        p.dest = null;
        p.frei = true;
      },
    };
    p.h = h;
    p.vor = '';
    p.url = a;
    try {
      const el = p.el;
      if (el.src !== a) el.src = u;
      el.loop = !!o.loop;
      el.volume = 1;
      const ab = Math.max(0, +o.ab || 0);
      const setz = () => {
        try {
          if (Math.abs(el.currentTime - ab) > 0.25) el.currentTime = ab;
        } catch (e) {}
      };
      if (el.readyState >= 1) setz();
      else {
        try {
          el.currentTime = ab;
        } catch (e) {}
        el.addEventListener('loadedmetadata', setz, { once: true });
      }
      p.node.connect(dest);
      p.dest = dest;
      const q = el.play();
      if (q && q.then)
        q.then(
          () => (p.wach = true),
          e => {
            // (a phone that was not woken by a tap yet: the caller falls back now, the next tap wakes the pool)
            if (e && e.name === 'NotAllowedError') h.gesperrt = true;
            if (!h.aus && e && e.name !== 'AbortError') h._ende(false);
          }
        );
    } catch (e) {
      h._ende(false);
    }
    return h;
  }
  // tests: the state as plain values
  const zahlen = () => ({
    base: M.BASE,
    st: stand(),
    n: S.list.length,
    bufs: S.bufs.size,
    bytes: S.bufs.bytes,
    pool: S.pool.length,
    spielt: S.pool.filter(p => !p.frei).length,
    vor: S.pool.filter(p => p.vor).length,
    holt: S.holt,
    fehler: S.fehler,
  });
  // after „Beenden“: every element silent and empty (the pool and its nodes stay for the next start – they cannot be made twice)
  function stille() {
    for (const p of S.pool) {
      if (p.h) p.h.stop();
      try {
        p.el.pause();
        p.el.removeAttribute('src');
        p.el.load();
      } catch (e) {}
      p.vor = '';
      p.url = '';
    }
    S.bufs.clear();
  }
  const API = {
    index,
    liste,
    eintrag,
    url,
    buffer,
    stream,
    vorlade,
    wecken,
    da,
    stand,
    zahlen,
    stille,
    norm,
    lizenz,
    LRU,
    S,
    // (a test may assign BASE directly; basis() also returns the old one)
    basis(b) {
      const o = M.BASE;
      if (typeof b === 'string' && b) M.BASE = b.endsWith('/') ? b : b + '/';
      return o;
    },
  };
  Object.defineProperty(API, 'BASE', {
    get: () => M.BASE,
    set: v => {
      if (typeof v === 'string' && v) M.BASE = v.endsWith('/') ? v : v + '/';
    },
    enumerable: true,
  });
  return API;
})();
if (typeof window !== 'undefined') window.GLMEDIEN = GLMEDIEN;
