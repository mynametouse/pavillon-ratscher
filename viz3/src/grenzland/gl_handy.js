// ===================== feat/grenzland: the phone (GLHANDY) – first version of the core: messages kept and shown as a list =====================
// The helper agent `grenzland-radio` replaces this by a real phone (messages, the village chat, the regional feed, bank, notes, camera).
// The interface stays:
//   GLHANDY.sms(von, text) · chat(wer, text) · feed(wer, text, ort) · note(titel, zeilen, quellen)
//   GLHANDY.open(tab) · close() · toggle() · isOpen() · unread() · tick(dt) · stop()
//   GLHANDY.kamera({ ziel: [x, y], r, n, sicht: () => bool, done }) – the camera for a mission: n photos of a target within r metres
// Events: 'grenzland:sms' { von, text }, 'grenzland:foto' { n }.
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { GL } from './gl_state.js';
import { GLTON } from './gl_ton.js';
import { GLHUD } from './gl_hud.js';
export const GLHANDY = (() => {
  const S = { open: false, notes: [], cam: null };
  function sms(von, text) {
    GL.sms.push({ von, text, t: Math.round(CLOCK.t), neu: true });
    if (GL.sms.length > 40) GL.sms.shift();
    GL.save();
    GLTON.fx('sms');
    PLAY.think('Nachricht von ' + von + ' (Handy: T)', 3200);
    GL.emit('sms', { von, text });
  }
  const chat = (wer, text) => {
    GL.feed.push({ wer, text, t: Math.round(CLOCK.t), k: 'chat' });
    if (GL.feed.length > 40) GL.feed.shift();
    GL.save();
  };
  const feed = (wer, text, ort) => {
    GL.feed.push({ wer, text, t: Math.round(CLOCK.t), k: 'feed', ort: ort || '' });
    if (GL.feed.length > 40) GL.feed.shift();
    GL.save();
  };
  const note = (titel, zeilen, quellen) => {
    if (!S.notes.some(n => n.titel === titel)) S.notes.push({ titel, zeilen, quellen: quellen || [] });
  };
  const unread = () => GL.sms.filter(q => q.neu).length;
  async function open() {
    if (S.open) return;
    S.open = true;
    const last = GL.sms.slice(-4).reverse();
    for (const q of GL.sms) q.neu = false;
    GL.save();
    const text = last.length ? last.map(q => q.von + ': ' + q.text).join(' · ') : 'Keine Nachrichten.';
    await GLHUD.wahl('Handy', text, [{ t: 'Schließen' }]);
    S.open = false;
    GL.emit('handy', { gelesen: last.length });
  }
  const close = () => {
    if (S.open) GLHUD.pick(0);
  };
  // the camera of a mission: „Foto machen“ counts when the target is within reach and in front
  function kamera(o) {
    S.cam = o ? Object.assign({ got: 0 }, o) : null;
  }
  function foto() {
    const c = S.cam;
    if (!c) return false;
    const d = Math.hypot(c.ziel[0] - P.x, c.ziel[1] - P.y);
    if (d > c.r || (c.sicht && !c.sicht())) {
      PLAY.think('Von hier sieht man nichts.', 1800);
      return false;
    }
    c.got++;
    GLTON.fx('foto');
    GL.emit('foto', { n: c.got });
    if (c.got >= c.n) {
      S.cam = null;
      if (c.done) c.done();
    } else PLAY.think('Foto ' + c.got + ' von ' + c.n + '.', 1500);
    return true;
  }
  return {
    sms,
    chat,
    feed,
    note,
    open,
    close,
    toggle: () => (S.open ? close() : open()),
    isOpen: () => S.open,
    unread,
    kamera,
    foto,
    cam: () => S.cam,
    tick() {},
    stop: close,
  };
})();
window.GLHANDY = GLHANDY;
