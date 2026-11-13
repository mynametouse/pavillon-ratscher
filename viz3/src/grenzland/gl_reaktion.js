// ===================== feat/grenzland-welt: the world notices the player (GLREAKTION) – witnesses film, the feed posts, people look, comment, answer =====================
// GTA 6 (previews, autumn 2026): witnesses film you and it shows up on social media; people react to being stared at and comment on
// your outfit; you choose how to answer. Here, with the region's satire and nothing mean:
//   filming   something wild near people (a deed somebody saw, a banger, a crash, a chase with the police passing, full speed over a
//             market square): one to three of the mode's figures nearby raise their phones for a few seconds (GLFIG.geste 'filmen'
//             when the figures' module has it); the moment is photographed from the nearest one's eyes – one extra frame, drawn once
//             into a 320 × 180 picture –, and some twenty seconds later it is a post in the phone's feed (the phone's public API
//             GLHANDY.feed(wer, text, ort, { img, live, likes, kom }) – the phone, agent `handy`, shows the picture); a big one (three
//             stars, a road block broken, the helicopter) is a LIVE post. S.gepostet keeps the last posts with their pictures (tests)
//   looking   whoever of the mode's people stands near looks at the player when he stops or looks at them (GLFIG.blick, or the figure
//             turns), and after a while says something (free play only): the clothes, the vehicle, what he just did, that he is wanted
//   answers   by a named person: „Ansprechen“ – Grüßen · Sprüche klopfen · Beruhigen · Provozieren (keys 1–4 or taps): a friendly answer;
//             a comeback (the person remembers it); a pending call to the police cut short and the search nearby eased; anger and a
//             call to the police (a report: one star in a few seconds, unless he talks the person out of it)
// Nothing runs before the scene starts (KERN.tick checks GL.on), all of it gone with „Beenden“ (grenzland:stop).
//   GLREAKTION.wild(kind, o) · knips(o) → data URL · ansprechen(F) · linien() → [[who, text], …] · S.filmer · S.posts · debug
import { R, cam } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { renderFrame } from '../render/render.js';
import { P } from '../game/walkable.js';
import { CAM3 } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { CLOCK } from '../time/clock.js';
import { GLLOGIK } from './gl_logik.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLFIG } from './gl_fig.js';
import { GLHUD } from './gl_hud.js';
import { GLHANDY } from './gl_handy.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLRXDATA } from './gl_reaktion_data.js';
export const GLREAKTION = (() => {
  const D = GLRXDATA;
  // a deed of its own: a provoked person calls the police (small: one star, and one can talk the person round)
  if (!GLLOGIK.CRIMES.poebeln) GLLOGIK.CRIMES.poebeln = { h: 0.5, name: 'Pöbelei' };
  const S = {
    filmT: 0, // until the next wild moment may be filmed
    filmer: [], // [{ F, t }] the figures filming now
    posts: [], // the posts to come: { t, kind, text, wer, img, live }
    gepostet: [], // the posts made (the newest twelve, with their pictures)
    snaps: 0,
    lastImg: '',
    stillT: 0, // how long the player has stood
    sagT: 0, // until somebody may comment again
    sagVon: {}, // figure id → seconds until it comments again
    blick: new Map(), // figure → seconds it has looked at the player
    tatT: 99, // seconds since a deed
    gemerkt: {}, // figure id → 'sprueche' | 'provoziert'
    wahl: null, // the figure being answered
    lastV: 0,
    jagdT: 0,
    marktT: 0,
    acc: 0,
    err: null,
    n: { film: 0, post: 0, sag: 0, wahl: 0 },
  };
  const hyp = Math.hypot;
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const heute = () => GL.on && GL.era === 'heute';
  // the mode's people who can notice the player (not the police, not the other of the two, not in another time, not lying down)
  const leute = (x, y, r) =>
    GLFIG.figs.filter(
      F =>
        F.g.visible &&
        !F.gone &&
        !F.cop &&
        !F.partner &&
        F.era === GL.era &&
        !(F.downT > 0) &&
        F.sees !== false &&
        hyp(F.x - x, F.y - y) < r
    );
  // who of the cast may comment and be answered (today's people who stand about in free play; the random events add theirs)
  const REDNER = new Set(['haendler', 'gerhard', 'jule', 'timo', 'basti', 'yuki']);
  const named = F => REDNER.has(F.id) && !!(GLDATA.CAST[F.id] && GLDATA.CAST[F.id].name);
  const ortName = (x, y) => {
    const p = String(KERN.place(x, y, 0) || '');
    return /Schleusingen|Markt|Bertholdsburg/.test(p)
      ? 'Schleusingen'
      : /Talsperre|Staumauer|Damm/.test(p)
        ? 'Talsperre'
        : /Klinge/.test(p)
          ? 'Klinge'
          : /Ratscher|Anger|Dorf|Garten|Linde/.test(p)
            ? 'Ratscher'
            : hyp(x - 222, y + 108) < 900
              ? 'Ratscher'
              : hyp(x + 1340, y - 1243) < 900
                ? 'Schleusingen'
                : '';
  };
  // ------------------------------------------------------------------ the snapshot ------------------------------------------------------------------
  // one frame drawn now (from the eyes at `von`, looking at `auf`, else the player's own view) and read at once into a small picture:
  // the canvas keeps what was drawn until the frame is shown, so it is read in the same task; the camera is put back right after
  function knips(o = {}) {
    let url = null;
    const pos = cam.position.clone(),
      q = cam.quaternion.clone(),
      fov = cam.fov;
    try {
      if (o.von && o.auf) {
        cam.position.set(o.von[0], o.von[2], -o.von[1]);
        cam.lookAt(o.auf[0], o.auf[2], -o.auf[1]);
        cam.fov = 52;
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld(true);
      }
      renderFrame();
      const src = R.domElement,
        w = src.width,
        h = src.height;
      if (w > 8 && h > 8) {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 180;
        const g = c.getContext('2d');
        let sw = w,
          sh = Math.round((w * 9) / 16);
        if (sh > h) {
          sh = h;
          sw = Math.round((h * 16) / 9);
        }
        g.drawImage(src, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, 320, 180);
        // a phone's picture: a little warmer and a soft dark rim
        const v = g.createRadialGradient(160, 90, 60, 160, 90, 200);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.32)');
        g.fillStyle = v;
        g.fillRect(0, 0, 320, 180);
        url = c.toDataURL('image/jpeg', 0.74);
      }
    } catch (e) {
      S.err = 'knips: ' + String((e && e.message) || e).slice(0, 160);
      url = null;
    } finally {
      cam.position.copy(pos);
      cam.quaternion.copy(q);
      if (cam.fov !== fov) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }
      cam.updateMatrixWorld(true);
      markDirty(true);
    }
    if (url && url.length > 1000) {
      S.snaps++;
      S.lastImg = url;
      S.imgT = 0;
      return url;
    }
    return null;
  }
  // ------------------------------------------------------------------ filming ------------------------------------------------------------------
  const where = () => {
    const v = VEH.cur;
    return v ? [v.st.x, v.st.y, KERN.ground(v.st.x, v.st.y)] : [P.x, P.y, P.feet];
  };
  // the player can be seen in a picture: on a vehicle always; on foot when the game shows his figure (the view from behind)
  const sichtbar = () => !!VEH.cur || !!(CAM3 && CAM3.on);
  function filmen(F, sek) {
    F.filmt = sek;
    const p = where();
    try {
      if (F.st !== 'geht') GLFIG.face(F, p[0], p[1]);
      if (GLFIG.geste) GLFIG.geste(F, 'filmen', { halten: true });
      if (GLFIG.blick) GLFIG.blick(F, 'spieler');
    } catch (e) {}
    S.filmer.push({ F, t: sek });
  }
  // something wild near people. kind: 'tat' | 'boeller' | 'crash' | 'jagd' | 'markt' | 'raserei' | 'sperre' | 'live'
  function wild(kind, o = {}) {
    if (!heute() || (S.filmT > 0 && !o.force)) return false;
    const p = where(),
      figs = leute(p[0], p[1], 38).sort((a, b) => hyp(a.x - p[0], a.y - p[1]) - hyp(b.x - p[0], b.y - p[1])),
      zeugen = o.zeugen ?? GLFAHNDUNG.zeugen().filter(z => !z.police).length;
    if (!figs.length && !zeugen && !o.force) return false;
    S.filmT = 22;
    // (in a mission or a scene the story's people are busy: nobody raises a phone there – the post comes all the same)
    const frei = !GL.cur && document.body.dataset.glKino !== '1',
      n = frei ? Math.min(figs.length, 1 + Math.floor(Math.random() * 3)) : 0;
    for (let i = 0; i < n; i++) filmen(figs[i], 5 + Math.random() * 3);
    // the moment: from the nearest filmer's eyes (when the player can be seen), else his own view
    // (the picture from just in front of the phone: half a metre from the filmer's eyes towards the player)
    const F = figs[0],
      fl = F ? hyp(p[0] - F.x, p[1] - F.y) || 1 : 1,
      von =
        F && frei && sichtbar()
          ? [F.x + ((p[0] - F.x) / fl) * 0.5, F.y + ((p[1] - F.y) / fl) * 0.5, (F.z || KERN.ground(F.x, F.y)) + 1.5]
          : null,
      img = knips(von ? { von, auf: [p[0], p[1], p[2] + 1.1] } : {});
    const ort = ortName(p[0], p[1]),
      stars = GLLOGIK.stars(GL.W),
      live = kind === 'live' || kind === 'sperre' || stars >= 3,
      L = D.POST[live && kind !== 'sperre' ? 'live' : kind] || D.POST.tat,
      text = rnd(L)
        .replace('{ort}', ort || 'Südthüringen')
        .replace('{tag}', D.TAG[ort] || D.TAG['']);
    S.posts.push({
      t: o.sofort ? 0.5 : 18 + Math.random() * 6,
      kind,
      text: live && !/^LIVE/.test(text) ? 'LIVE: ' + text : text,
      wer: live ? D.LIVE_WER : rnd(D.WER),
      img,
      live,
      ort,
    });
    S.n.film++;
    GL.emit('gefilmt', { kind, n, img: !!img, ort });
    return true;
  }
  function posten(q) {
    if (q.kind === 'fahndung') {
      const b = GLFAHNDUNG.beschreibung ? GLFAHNDUNG.beschreibung() : '',
        p = where(),
        ort = ortName(p[0], p[1]) || 'Südthüringen';
      if (!b || GLLOGIK.stars(GL.W) < 1) return;
      q.text = D.FAHNDUNG.replace('{ort}', ort)
        .replace('{bild}', b)
        .replace('{tag}', D.TAG[ort] || D.TAG['']);
    }
    const likes = 12 + Math.floor(Math.random() * (q.live ? 900 : 240)),
      kom = [];
    const pool = D.KOMMENTAR.slice();
    for (let i = 0, k = 2 + Math.floor(Math.random() * 3); i < k && pool.length; i++)
      kom.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    GLHANDY.feed(q.wer, q.text, '', { img: q.img || '', live: !!q.live, likes, kom });
    S.gepostet.push({ wer: q.wer, text: q.text, img: q.img || '', live: !!q.live, likes, kom });
    if (S.gepostet.length > 12) S.gepostet.shift();
    try {
      GLTON.fx('sms');
    } catch (e) {}
    if (!(GLHANDY.isOpen && GLHANDY.isOpen()))
      PLAY.think(
        q.live ? 'Du bist live im Feed. (Handy: T)' : 'Jemand hat dich gefilmt – jetzt im Feed. (Handy: T)',
        3200
      );
    S.n.post++;
    GL.emit('post', { kind: q.kind, live: q.live, img: !!q.img });
  }
  // ------------------------------------------------------------------ looking, commenting ------------------------------------------------------------------
  function sag(F, text, sek) {
    GLHUD.sub(F.name, text, Math.max(2200, text.length * 62));
    try {
      GLFIG.talking(F, true);
      setTimeout(() => GLFIG.talking(F, false), Math.max(1800, text.length * 60));
    } catch (e) {}
    try {
      STIMME.say('gl_' + F.id, text, { at: [F.x, F.y] });
    } catch (e) {}
    S.sagT = sek || 9;
    S.sagVon[F.id] = 45;
    S.n.sag++;
    GL.emit('reaktion', { wer: F.id, text });
  }
  // what a person says to the player now (a fixed line)
  function zeile(F) {
    const st = GLLOGIK.stars(GL.W),
      ist = GLFAHNDUNG.ist ? GLFAHNDUNG.ist() : { kleid: '', kopf: '', fz: '' };
    if (S.tatT < 30) return rnd(D.SAGT.tat);
    if (st > 0 && (F.knows || Math.random() < 0.5)) return rnd(D.SAGT.gesucht);
    const r = Math.random();
    if (ist.fz && D.SAGT.fz[ist.fz] && r < 0.6) return rnd(D.SAGT.fz[ist.fz]);
    if (ist.kopf === 'haube') return rnd(D.SAGT.kleid.haube);
    if (ist.kopf === 'helm' && r < 0.3) return rnd(D.SAGT.kleid.helm);
    if (D.SAGT.kleid[ist.kleid] && r < 0.65) return rnd(D.SAGT.kleid[ist.kleid]);
    return rnd(D.SAGT.blick);
  }
  function schauen(dt) {
    // (only in free play: in a mission the scenes decide where people look – what looked at him lets go)
    if (GL.cur || document.body.dataset.glKino === '1') {
      for (const F of S.blick.keys())
        try {
          if (GLFIG.blick && !F.gone && !F.filmt) GLFIG.blick(F, null);
        } catch (e) {}
      S.blick.clear();
      S.stillT = 0;
      return;
    }
    const p = where(),
      v = VEH.cur ? hyp(VEH.cur.st.u, VEH.cur.st.v) : P.speed || 0;
    S.stillT = v < 0.4 ? S.stillT + dt : 0;
    const yaw = VEH.cur ? VEH.cur.st.psi : (P.yaw * Math.PI) / 180;
    const nah = leute(p[0], p[1], 12);
    for (const F of nah) {
      const d = hyp(F.x - p[0], F.y - p[1]);
      let a = Math.atan2(F.x - p[0], F.y - p[1]) - yaw;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      // he stops near them, or looks at them
      const merkt = (S.stillT > 1.2 && d < 8) || (Math.abs(a) < 0.22 && d < 12);
      const t = merkt ? (S.blick.get(F) || 0) + dt : 0;
      if (t > 0 && !S.blick.get(F)) {
        try {
          if (GLFIG.blick) GLFIG.blick(F, 'spieler');
          else if (F.st !== 'geht' && !F.filmt) GLFIG.face(F, p[0], p[1]);
        } catch (e) {}
      }
      if (!t && S.blick.get(F)) {
        try {
          if (GLFIG.blick && !F.filmt) GLFIG.blick(F, null);
        } catch (e) {}
      }
      S.blick.set(F, t);
      // after a while a word
      if (t > 2.4 && S.sagT <= 0 && !(S.sagVon[F.id] > 0) && named(F) && !S.wahl) sag(F, zeile(F));
    }
    for (const F of [...S.blick.keys()]) if (!nah.includes(F)) S.blick.delete(F);
  }
  // ------------------------------------------------------------------ the four answers ------------------------------------------------------------------
  const ARTEN = ['gruessen', 'sprueche', 'beruhigen', 'provozieren'];
  // the named person the player stands by, facing (the action button)
  function gegenueber() {
    if (!heute() || VEH.cur || S.wahl || GL.cur) return null;
    const p = where(),
      yaw = (P.yaw * Math.PI) / 180;
    let best = null,
      bd = 3.2;
    for (const F of leute(p[0], p[1], 3.2)) {
      if (!named(F) || F.st === 'geht') continue;
      const d = hyp(F.x - p[0], F.y - p[1]);
      let a = Math.atan2(F.x - p[0], F.y - p[1]) - yaw;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) < 1.1 && d < bd) {
        bd = d;
        best = F;
      }
    }
    return best;
  }
  async function ansprechen(F) {
    F = F || gegenueber();
    if (!F || S.wahl) return -1;
    S.wahl = F;
    S.n.wahl++;
    const p = where();
    try {
      if (F.st !== 'geht') GLFIG.face(F, p[0], p[1]);
      if (GLFIG.blick) GLFIG.blick(F, 'spieler');
    } catch (e) {}
    const W = D.WAHL,
      i = await GLHUD.wahl(
        F.name,
        W.titel,
        ARTEN.map((k, j) => ({ t: j + 1 + ' · ' + W[k].t }))
      );
    S.wahl = null;
    if (i < 0 || !GL.on) return -1;
    const art = ARTEN[i],
      A = W[art],
      ich = A.ich[GL.wer] || A.ich.m,
      mem = S.gemerkt[F.id];
    GLHUD.sub(GL.name(), ich, 2400);
    try {
      STIMME.say('gl_' + (GL.wer === 'f' ? 'sarah' : 'falko'), ich);
    } catch (e) {}
    await warte(2.4);
    if (!GL.on) return i;
    let antwort = rnd(A.er);
    if (mem === 'provoziert') antwort = W.provozieren.ruhig;
    else if (art === 'gruessen' && mem === 'sprueche') {
      antwort = W.gruessen.sauer;
      delete S.gemerkt[F.id];
    }
    if (art === 'sprueche') S.gemerkt[F.id] = 'sprueche';
    if (art === 'beruhigen') {
      // a call this person was making is cut short; a search nearby eases
      const key = 'fig:' + F.id,
        cut = GLLOGIK.still(GL.W, key);
      if (GLLOGIK.stars(GL.W) > 0) GL.W.unseen += 10;
      if (cut) GL.emit('zeuge', { wer: F.name, still: true });
      if (mem === 'provoziert') delete S.gemerkt[F.id];
    }
    if (art === 'provozieren' && mem !== 'provoziert') {
      S.gemerkt[F.id] = 'provoziert';
      // angry: the phone out – a report in a few seconds (one star), unless he talks the person round in time
      const q = GLLOGIK.melden(GL.W, 'poebeln', { seen: 1, knows: !!F.knows, key: 'fig:' + F.id, t: CLOCK.t });
      if (q) {
        q.name = F.name;
        q.ref = { k: 'fig', F };
        q.x = p[0];
        q.y = p[1];
        q.ist = GLFAHNDUNG.ist ? GLFAHNDUNG.ist() : undefined;
        q.d = hyp(F.x - p[0], F.y - p[1]);
        try {
          if (GLFIG.geste) GLFIG.geste(F, 'telefon', { sec: q.t });
        } catch (e) {}
      }
    }
    sag(F, antwort, 4);
    GL.emit('antwort', { wer: F.id, art });
    return i;
  }
  const warte = sec => new Promise(res => (window.FREEZE ? setTimeout(res, 0) : setTimeout(res, sec * 1000)));
  KERN.act({
    id: 'gl-ansprechen',
    prio: 0.1, // (below every action of the places: the van's shopping, the stalls)
    r: 3.2,
    label: () => {
      const F = gegenueber();
      return F ? 'Ansprechen: ' + F.name : null;
    },
    pos: () => {
      const F = gegenueber();
      return F ? [F.x, F.y, (F.z || 0) + 1] : [0, 0, -999];
    },
    run: () => ansprechen(),
  });
  // keys 1–4 while the answers are open (in front of the game's own number keys)
  window.addEventListener(
    'keydown',
    e => {
      if (!S.wahl || !GL.on || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      GLHUD.pick(+e.key - 1);
    },
    true
  );
  // ------------------------------------------------------------------ what happens ------------------------------------------------------------------
  KERN.on('grenzland:tat', d => {
    if (!heute() || !d) return;
    S.tatT = 0;
    if (d.zeugen > 0 && d.id !== 'helm' && d.id !== 'poebeln')
      wild(d.id === 'sperre' ? 'sperre' : d.id === 'raserei' ? 'raserei' : 'tat', { zeugen: d.zeugen });
  });
  KERN.on('grenzland:boeller', () => heute() && wild('boeller'));
  KERN.on('grenzland:sterne', d => {
    // (the level itself, not the stars shown – one fewer while the two are apart)
    const n = GLLOGIK.starsOf(GL.W.heat);
    if (heute() && d && n >= 4 && S.filmT <= 0) wild('live', { force: false });
    // from two stars: the region's blue-light page posts the police's description (once per search; the words when it is posted)
    if (heute() && d && n >= 2 && !S.fahndung) {
      S.fahndung = true;
      S.posts.push({
        t: 14,
        kind: 'fahndung',
        text: '',
        wer: D.BLAULICHT,
        img: S.lastImg && S.imgT < 90 ? S.lastImg : '',
        live: false,
      });
    }
  });
  KERN.on('grenzland:entkommen', () => (S.fahndung = false));
  KERN.on('grenzland:erwischt', () => (S.fahndung = false));
  KERN.on('grenzland:stop', () => {
    for (const q of S.filmer) q.F.filmt = 0;
    S.filmer.length = 0;
    S.posts.length = 0;
    S.gepostet.length = 0;
    S.fahndung = false;
    S.lastImg = '';
    S.blick.clear();
    S.gemerkt = {};
    S.sagVon = {};
    S.wahl = null;
    S.filmT = S.sagT = 0;
  });
  // ------------------------------------------------------------------ per frame ------------------------------------------------------------------
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(dt);
    } catch (e) {
      if (!S.err) console.warn('grenzland reactions', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
    }
  }
  function lauf(dt) {
    S.imgT = (S.imgT ?? 999) + dt;
    if (S.filmT > 0) S.filmT -= dt;
    if (S.sagT > 0) S.sagT -= dt;
    S.tatT += dt;
    for (const k in S.sagVon) if ((S.sagVon[k] -= dt) <= 0) delete S.sagVon[k];
    // the phones go down again
    for (let i = S.filmer.length - 1; i >= 0; i--) {
      const q = S.filmer[i];
      if ((q.t -= dt) <= 0 || q.F.gone) {
        q.F.filmt = 0;
        try {
          if (GLFIG.geste && !q.F.gone) GLFIG.geste(q.F, null);
          if (GLFIG.blick && !q.F.gone) GLFIG.blick(q.F, null);
        } catch (e) {}
        S.filmer.splice(i, 1);
      } else q.F.filmt = q.t;
    }
    // the posts come in
    for (let i = S.posts.length - 1; i >= 0; i--)
      if ((S.posts[i].t -= dt) <= 0) {
        const q = S.posts.splice(i, 1)[0];
        if (GL.era === 'heute') posten(q);
      }
    if (GL.era !== 'heute') return;
    // a crash: the vehicle loses much speed at once; a chase passing people; full speed over a market square
    const v = VEH.cur ? hyp(VEH.cur.st.u, VEH.cur.st.v) : 0;
    if (VEH.cur && S.lastV - v > 6.5 && dt < 0.2) wild('crash');
    S.lastV = v;
    S.jagdT -= dt;
    S.marktT -= dt;
    if (VEH.cur && v > 8 && GLFAHNDUNG.seen && GLLOGIK.stars(GL.W) >= 2 && S.jagdT <= 0) {
      S.jagdT = 50;
      wild('jagd');
    }
    if (VEH.cur && v > 11 && S.marktT <= 0) {
      const p = where();
      if (/Markt/.test(String(KERN.place(p[0], p[1], 0) || ''))) {
        S.marktT = 60;
        wild('markt');
      }
    }
    if ((S.acc += dt) >= 0.2) {
      schauen(S.acc);
      S.acc = 0;
    }
  }
  KERN.tick(tick, 'grenzland/reaktion');
  // every line spoken here, for the recordings (grenzland/gl_stimmen.js): [who, text] – the people's lines for each named person of
  // today who can stand about in free play, the player's own answers for Falko and Sarah
  function linien() {
    const L = [],
      wer = [...REDNER],
      alles = [];
    const sammle = o => (Array.isArray(o) ? alles.push(...o) : Object.values(o).forEach(sammle));
    sammle(D.SAGT);
    for (const k of ARTEN) sammle(D.WAHL[k].er);
    alles.push(D.WAHL.gruessen.sauer, D.WAHL.provozieren.ruhig);
    for (const id of wer) for (const t of alles) L.push([id, t]);
    for (const k of ARTEN) {
      L.push(['falko', D.WAHL[k].ich.m]);
      L.push(['sarah', D.WAHL[k].ich.f]);
    }
    return L;
  }
  Object.assign(S, {
    REDNER,
    wild,
    knips,
    ansprechen,
    gegenueber,
    linien,
    tick,
    debug: {
      wild: (kind, o) => wild(kind, Object.assign({ force: true }, o)),
      posts: () => S.posts.map(q => ({ t: q.t, kind: q.kind, text: q.text, img: q.img ? q.img.length : 0 })),
      flush: () => S.posts.forEach(q => (q.t = 0)),
    },
  });
  return S;
})();
window.GLREAKTION = GLREAKTION;
