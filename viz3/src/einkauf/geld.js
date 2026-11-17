// ===================== feat/laeden-leben 3: the wallet (GELD) – free play's own money, in the Grenzland mode the mode's =====================
// One path for both (docs/features/laeden-leben.md): every price, every till and every reward goes through GELD. In free play GELD keeps
// its own wallet (saved 'pav-geld-v1', in cent; a fresh game starts with 150 € in the purse). While the Grenzland mode runs
// (grenzland/gl_state.js, window.GLSTATE with on = true) the money is the mode's: whole euros in GL.geld (GL.pay / GL.earn – the mode's
// HUD shows them), and the cents a till asks for come out of the purse's small change, which GELD keeps beside it for the mode
// (paying 3,47 € with 12 cents of change: 4 € from GL.pay, 53 cents back into the change). Earning in free play: what the garden and the
// workshop sell (GELD.verdienen from their modules; events below), a few euros for odd jobs of the side quests.
//   GELD.stand() → cent · GELD.text(cent?) → '148,20 €' · GELD.zahlen(cent, wofuer) → true | false (not enough) · GELD.verdienen(cent, wofuer)
//   GELD.modus() → 'frei' | 'grenzland' · events KERN 'geld' { d, stand, wofuer, modus } · GELD.reset() (tests)
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { WAREN } from './waren.js';
export const GELD = (() => {
  const START = 15000;
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const KEY = SAVE.key('pav-geld-v1', {
    owner: 'einkauf',
    kind: 'json',
    def: null,
    check: v => v === null || (obj(v) && v.v === 1),
  });
  const S = { v: 1, cent: START, klein: 0, log: [] };
  {
    const s = SAVE.get(KEY);
    if (s) {
      if (Number.isFinite(s.cent)) S.cent = Math.max(0, Math.round(s.cent));
      if (Number.isFinite(s.klein)) S.klein = Math.max(0, Math.min(99, Math.round(s.klein)));
      if (Array.isArray(s.log)) S.log = s.log.filter(q => obj(q) && Number.isFinite(q.d)).slice(-20);
    }
  }
  const save = () => SAVE.set(KEY, { v: 1, cent: S.cent, klein: S.klein, log: S.log.slice(-20) });
  // the mode's state while it runs (guarded: the mode may not be there)
  const gl = () => {
    const G = typeof window !== 'undefined' ? window.GLSTATE : null;
    return G && G.on && typeof G.pay === 'function' && typeof G.earn === 'function' ? G : null;
  };
  const modus = () => (gl() ? 'grenzland' : 'frei');
  function stand() {
    const G = gl();
    return G ? Math.max(0, Math.round(G.geld)) * 100 + S.klein : S.cent;
  }
  const text = c => WAREN.euro(c === undefined ? stand() : c);
  function note(d, why) {
    S.log.push({ d, why: String(why || '').slice(0, 60) });
    if (S.log.length > 20) S.log.shift();
    save();
    KERN.emit('geld', { d, stand: stand(), wofuer: why || '', modus: modus() });
  }
  function zahlen(c, why) {
    c = Math.round(c);
    if (!(c > 0)) return c === 0;
    const G = gl();
    if (G) {
      if (stand() < c) return false;
      const ct = c % 100;
      let eu = Math.floor(c / 100);
      if (ct > S.klein) {
        eu += 1;
        S.klein += 100 - ct;
      } else S.klein -= ct;
      if (eu > 0 && !G.pay(eu, why || 'Einkauf')) return false;
      note(-c, why);
      return true;
    }
    if (S.cent < c) return false;
    S.cent -= c;
    note(-c, why);
    return true;
  }
  function verdienen(c, why) {
    c = Math.round(c);
    if (!(c > 0)) return 0;
    const G = gl();
    if (G) {
      S.klein += c % 100;
      let eu = Math.floor(c / 100);
      if (S.klein >= 100) {
        eu += 1;
        S.klein -= 100;
      }
      if (eu > 0) G.earn(eu, why || 'Verdienst');
    } else S.cent += c;
    note(c, why);
    return c;
  }
  function reset(c = START) {
    S.cent = c;
    S.klein = 0;
    S.log = [];
    save();
  }
  return Object.assign(S, { START, KEY, stand, text, zahlen, verdienen, modus, reset });
})();
window.GELD = GELD;
