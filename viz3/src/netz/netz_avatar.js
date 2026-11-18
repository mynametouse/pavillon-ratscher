// ===================== feat/mehrspieler: one's own avatar and the other players' figures (NAVATAR) =====================
// An avatar is a plan of a few small numbers (netz/netz_logik.js): one of the three of the game as they are (Falko, Sarah, Christoph), or
// one of the ten people of the streets (Rocketbox, MIT) whose clothes take the colours one picks, with a hat, glasses, a moustache. Only
// the plan travels; every browser builds the figure itself from the same files – no uploads, nothing of anybody's to check.
// One's own figure is the game's (game/avatar.js AVATAR: the people of the streets there as kinds of their own, marked hook), painted
// the way grenzland/gl_1989.js paints the young Gerhard (GLFIG.pixels → dress → kopf → forget). The others are figures of GLFIG (the
// Grenzland's people: clothes by body zone, headwear, gestures, sitting) under cast entries of our own ('netz_<pid>' in GLDATA.CAST and
// KLEID), posed here every frame from what their browser sends (netz/netz.js) – never through GLFIG.tick, which walks paths.
//   NAVATAR.pid · name() · av · set({ name, av }) · applyLocal() · make(pid, name, av) → F · drop(F) · pose(F, p, dt) · geste(F, art, ziel)
// Saved: 'pav-netz-v1' { v: 1, pid, name, av } – who one is for the others (the id stays, so a reload is the same player again).
import { markDirty, whenLoaded } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { AVATAR } from '../game/avatar.js';
import { GLDATA } from '../grenzland/gl_data.js';
import { GLFIG } from '../grenzland/gl_fig.js';
import { GLPOSE } from '../grenzland/gl_pose.js';
import { NETZLOGIK as L } from './netz_logik.js';
export const NAVATAR = (() => {
  const KEY = SAVE.key('pav-netz-v1', {
    owner: 'Zusammen spielen: Name und Avatar',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (!!v &&
        typeof v === 'object' &&
        v.v === 1 &&
        typeof v.pid === 'string' &&
        /^[A-Za-z0-9_-]{6,32}$/.test(v.pid) &&
        typeof v.name === 'string' &&
        v.name.length <= 40),
  });
  const rnd36 = n =>
    Math.random()
      .toString(36)
      .slice(2, 2 + n)
      .padEnd(n, '0');
  const newPid = () => 'n' + rnd36(8) + rnd36(4);
  const saved = SAVE.get(KEY);
  // the id for the others: this browser's (saved) and one of this page – two tabs of one browser are two players (Falko tried the
  // zombie night so); a reloaded page is a new id of the same browser, netz/netz.js lets the old one go when it is silent
  const base = saved ? saved.pid : newPid();
  const S = {
    base,
    pid: base + '-' + rnd36(4),
    nm: saved ? L.cleanName(saved.name) : '',
    av: saved ? L.avClean(saved.av) : L.avDefault(AVATAR.kind),
    gl: false,
    busy: false,
    again: false,
    dressed: 0,
    err: null,
    made: 0,
    dropped: 0,
  };
  const save = () => SAVE.set(KEY, { v: 1, pid: S.base, name: S.nm, av: S.av });
  if (!saved) save();
  // the name the others read: one's own, else the figure's (Falko, Sarah, Christoph) or „Gast“
  const name = () => S.nm || (L.avBase(S.av).haupt ? L.avBase(S.av).name : 'Gast');
  // ---- one's own figure ----
  const LOC = { fig: null, key: '', restore: [], tex: [], extra: [] };
  function undress() {
    for (const [m, map] of LOC.restore) {
      m.map = map;
      m.needsUpdate = true;
    }
    for (const t of LOC.tex) t.dispose();
    for (const g of LOC.extra) if (g && g.parent) g.parent.remove(g);
    LOC.restore = [];
    LOC.tex = [];
    LOC.extra = [];
    LOC.fig = null;
    LOC.key = '';
  }
  // the cap of a colour of one's own: a basecap in the player's colour (GLFIG's HUTC entries: [shape, linear colours])
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function hutKey(hut, av) {
    if (hut !== 'basecap') return hut;
    const k = 'netz_cap_' + av.c;
    if (GLFIG.HUTC && !GLFIG.HUTC[k]) {
      const c = hexRGB(L.FARBEN[av.c].css).map(v => lin(v / 255));
      GLFIG.HUTC[k] = ['basecap', { top: c, band: c }];
    }
    return GLFIG.HUTC && GLFIG.HUTC[k] ? k : hut;
  }
  // put the plan on one's own figure; one call at a time – a newer plan while one is busy runs right after it
  async function applyLocal() {
    if (S.busy) {
      S.again = true;
      return false;
    }
    S.busy = true;
    try {
      return await applyNow();
    } finally {
      S.busy = false;
      if (S.again) {
        S.again = false;
        setTimeout(applyLocal, 0);
      }
    }
  }
  async function applyNow() {
    if (!window.PLAYERMAN || AVATAR.failed || S.gl) return false;
    const av = S.av,
      base = L.avBase(av),
      key = JSON.stringify(av);
    try {
      if (AVATAR.kind !== base.k || !AVATAR.fig) await AVATAR.setKind(base.k);
    } catch (e) {
      S.err = 'figure: ' + String((e && e.message) || e).slice(0, 100);
      return false;
    }
    if (key !== JSON.stringify(S.av)) return false; // (changed meanwhile: S.again runs it once more)
    const F = AVATAR.figs && AVATAR.figs[base.k];
    if (!F || !F.model || AVATAR.kind !== base.k) return false;
    if (LOC.fig === F && LOC.key === key) return true;
    undress();
    if (base.haupt) {
      LOC.fig = F;
      LOC.key = key;
      return true;
    }
    try {
      await GLFIG.pixels(F.model, (window.CHARMAN || {})[base.fig]);
      const restore = [],
        tex = GLFIG.dress(F.model, L.avKleid(av), restore),
        hh = L.avHut(av),
        extra = [];
      if (hh.hut) {
        const g = GLFIG.hatOn(F.model, null, hutKey(hh.hut, av));
        if (g) extra.push(g);
      }
      if (hh.brille || hh.bart)
        for (const g of GLFIG.kopf(F.model, { brille: hh.brille || null, bart: hh.bart || null })) extra.push(g);
      GLFIG.forget(F.model);
      Object.assign(LOC, { fig: F, key, restore, tex, extra });
      S.dressed++;
      markDirty(true);
      return true;
    } catch (e) {
      S.err = 'dress: ' + String((e && e.message) || e).slice(0, 100);
      console.warn('netz avatar', e);
      GLFIG.forget(F.model);
      return false;
    }
  }
  // a new name or plan: kept, put on, told to the others
  function set(o = {}) {
    let changed = false;
    if (o.name !== undefined) {
      const n = L.cleanName(o.name);
      if (n !== S.nm) {
        S.nm = n;
        changed = true;
      }
    }
    if (o.av) {
      const a = L.avClean(o.av);
      if (!L.avSame(a, S.av)) {
        S.av = a;
        changed = true;
      }
    }
    if (!changed) return false;
    save();
    applyLocal();
    KERN.emit('netz:avatar', { name: name(), av: S.av });
    return true;
  }
  // the game's figure changed elsewhere (Menü → Einstellungen → Spielfigur): the avatar follows; the Grenzland's duo is its own business
  KERN.on('grenzland:start', () => (S.gl = true));
  KERN.on('grenzland:stop', () => {
    S.gl = false;
    setTimeout(applyLocal, 1500);
  });
  let lastKind = AVATAR.kind,
    checkT = 0;
  KERN.tick(dt => {
    checkT -= dt;
    if (checkT > 0 || S.gl || S.busy) return;
    checkT = 0.5;
    if (AVATAR.kind !== lastKind) {
      lastKind = AVATAR.kind;
      if (AVATAR.kind !== S.av.b && L.BASEN.some(b => b.k === AVATAR.kind)) {
        S.av = L.avClean(Object.assign({}, S.av, { b: AVATAR.kind }));
        save();
        KERN.emit('netz:avatar', { name: name(), av: S.av });
      }
    }
    // the figure loaded (after the start, after a mode gave it back): paint it if it is ours and not painted yet
    if (AVATAR.fig && AVATAR.kind === S.av.b && (LOC.fig !== AVATAR.fig || LOC.key !== JSON.stringify(S.av)))
      applyLocal();
  }, 'netz/avatar');
  if (L.avBase(S.av).k !== AVATAR.kind && !L.avBase(S.av).haupt) whenLoaded(() => setTimeout(() => applyLocal(), 1500));
  // ---- the others: figures of GLFIG under cast entries of our own ----
  const castId = pid => 'netz_' + pid;
  async function make(pid, nm, av) {
    av = L.avClean(av);
    const base = L.avBase(av),
      id = castId(pid),
      K = L.avKleid(av),
      hh = L.avHut(av);
    if (K) GLDATA.KLEID[id] = K;
    else delete GLDATA.KLEID[id];
    GLDATA.CAST[id] = {
      name: nm,
      fig: base.fig,
      clips: base.g,
      h: base.h,
      kleid: K ? id : undefined,
      // (Christoph's own cap is built by game/avatar.js only – for the others a dark basecap like it)
      hut: hh.hut ? hutKey(hh.hut, av) : base.k === 'c' ? 'basecap' : undefined,
      brille: hh.brille || undefined,
      bart: hh.bart || undefined,
      voice: { g: base.g, age: 35 },
    };
    if (!GLFIG.avail(id)) return null;
    const F = await GLFIG.make(id);
    if (!F) return null;
    F.netz = { pid, k: base.k, h: base.h, ow: 0, ok: null, sitK: null };
    F.g.visible = false;
    F.r = 0; // (not a witness of the Grenzland's)
    S.made++;
    return F;
  }
  function drop(F) {
    if (!F) return;
    GLFIG.drop(F);
    if (F.id && F.id.startsWith('netz_') && !Object.values(GLFIG.figs || []).some(q => q.id === F.id)) {
      delete GLDATA.CAST[F.id];
      delete GLDATA.KLEID[F.id];
    }
    S.dropped++;
  }
  // ---- posing another player: p = { x, y, z, hd (deg), sp, stn, air, jet, sit: { k, x, y, z } | null } in site coordinates ----
  const SITZ = 0.1; // the seat under the hip joints (as grenzland/gl_fig.js)
  function over(F, k, dt) {
    const n = F.netz;
    if (k !== n.ok) {
      n.ow = Math.max(0, n.ow - dt * 6);
      if (n.ow <= 0) n.ok = k;
    } else n.ow = Math.min(1, n.ow + dt * 6);
    F.f.over = n.ok && n.ow > 0 ? { k: n.ok, w: n.ow } : null;
  }
  function pose(F, p, dt) {
    if (!F || !F.f || !F.g) return;
    const n = F.netz,
      M = (F.set && F.set.meta) || {},
      sc = n.h / ((F.set && F.set.h) || (F.c && F.c.clips === 'f' ? 1.766 : 1.816)),
      hd = (p.hd * Math.PI) / 180;
    let x = p.x,
      y = p.y,
      z = p.z,
      sp = p.sp;
    const sit = p.sit && p.sit.k === 'sit',
      lie = (p.sit && p.sit.k === 'lie') || p.stn === 'prone';
    if (sit) {
      // as game/avatar.js puts one's own figure on a seat: the hips under the eye
      const sh = ((M.sitHip && M.sitHip.y) || 0.59) * sc;
      x = p.sit.x;
      y = p.sit.y;
      z = p.sit.z - 0.78 + 0.11 - sh;
      sp = 0;
      if (!F.sitzt) {
        F.sitzt = true;
        F.f.mode = 'sit';
      }
      F.boden = p.z;
      F.sitzH = Math.max(0.3, z + (F.f.hipH || 0.95) - SITZ - p.z);
    } else if (F.sitzt) {
      F.sitzt = false;
      F.boden = null;
      F.f.mode = 'stand';
    }
    if (p.sit && p.sit.k === 'lie') {
      const lh = ((M.lieHip && M.lieHip.y) || 0.07) * sc;
      x = p.sit.x;
      y = p.sit.y;
      z = p.sit.z - 0.62 + 0.1 - lh;
      sp = 0;
    }
    // ducking, crawling, lying, in the air: clips of the set over the walk
    const k = lie
      ? 'lie'
      : p.stn === 'crawl'
        ? 'crawl'
        : p.stn === 'crouch'
          ? sp > 0.15
            ? 'crouchWalk'
            : 'crouchIdle'
          : p.air && !p.jet
            ? 'jumpLoop'
            : null;
    over(F, k, dt);
    F.x = x;
    F.y = y;
    F.z = z;
    F.hd = hd;
    F.g.position.set(x, z, -y);
    F.g.rotation.set(0, -hd, 0);
    GLPOSE.back(F.rig);
    F.f.anim(dt, k ? 0 : sp);
    GLPOSE.nach(F, F.rig, dt, k ? 0 : sp);
  }
  // a gesture of the other one (grenzland/gl_pose.js ARTEN); 'zeigen' toward a point [x, y, z]
  function geste(F, art, ziel) {
    if (!F) return 0;
    return GLFIG.geste(F, art, ziel ? { ziel, sec: 2.2 } : {});
  }
  // one's own gesture: the clips of the player's set (game/avatar.js gesture) – 'greet' waves, 'nod' nods; the rest only the others see
  const OWN = { winken: 'greet', nicken: 'nod' };
  const gesteSelf = art => (OWN[art] ? AVATAR.gesture(OWN[art]) : 0);
  return Object.assign(S, {
    KEY,
    name,
    set,
    applyLocal,
    undress,
    make,
    drop,
    pose,
    geste,
    gesteSelf,
    castId,
    LOC,
  });
})();
window.NAVATAR = NAVATAR;
