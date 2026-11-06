// ===================== feat/wissen 3: people as teachers – a topic in their talk opens an entry of the discovery book (WLEHRER) =====================
// Gerhard (retired teacher, the village chronicler) for history and the old crafts, Wolfgang (the forest worker who knows every tree at
// the Klinge) for the forest, Ingrid (the Ortsteilbürgermeisterin) for the municipality, Hubert and Ronald for wood and animals
// (wissen/wissen_data.js TEACH). The villagers get the topics as extra entries in their data (dorf/dorf_text.js): the talk panel
// (dorf/dorf.js) shows them as buttons and says their lines in turn, its event 'dorf:thema' { who, id, n } (one marked line there) says
// which was asked – their own topics that teach something count too (gerhard: schule, linde …). Hubert and Ronald: an extension of their
// talk panel (npc/npc.js NPCUI.extend: topics(w) / ask(w, k), marked hooks there) – they say the line in their voice, then it opens.
import { KERN } from '../core/kern.js';
import { COARSE } from '../core/head.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { NPCUI } from '../npc/npc.js';
import { WDATA } from './wissen_data.js';
import { WISSEN } from './wissen.js';
export const WLEHRER = (() => {
  const D = WDATA;
  const VIL = {};
  // the villagers: topics 'wi_<id>' with [label, …lines] (the panel rotates the lines with each ask)
  for (const [who, list] of Object.entries(D.TEACH)) {
    const p = DTEXT.P && DTEXT.P[who];
    if (!p || !p.topics) continue;
    for (const t of list) {
      p.topics['wi_' + t.id] = [t.label, ...t.lines];
      VIL[who + ':wi_' + t.id] = t;
    }
  }
  // which entries an ask opens: a topic with as many lines as entries teaches one entry per line, in turn; otherwise all of them
  function pick(t, n) {
    if (t.entry) return [t.entry];
    const E = t.entries || [];
    if (E.length && E.length === t.lines.length) return [E[(Math.max(1, n) - 1) % E.length]];
    return E;
  }
  const nameOf = who => (DTEXT.P && DTEXT.P[who] && DTEXT.P[who].name) || (D.ROLE[who] || who).split(',')[0];
  // what a teacher taught is found; the first time, the book opens beside the talk on what was told (on a phone the notice offers it –
  // the panels would cover each other there)
  function teach(ids, who) {
    let first = null;
    for (const id of ids) if (WISSEN.found(id, 'gespraech:' + who) && !first) first = id;
    if (first && !COARSE) WISSEN.open(first);
    return first;
  }
  KERN.on('dorf:thema', d => {
    if (!d || !d.who || !d.id) return;
    const t = VIL[d.who + ':' + d.id];
    if (t) teach(pick(t, d.n || 1), nameOf(d.who));
    else WISSEN.talk(d.who, d.id, nameOf(d.who));
  });
  // Hubert and Ronald: topics 'x_wi_<id>' in their panel; the line said is the next of the topic's lines
  const N = {};
  NPCUI.extend({
    topics(w) {
      const list = w && D.TEACH[w.name];
      // a topic may need a feature in the build (need: 'HUND' – the dog of feat/tiere)
      return list ? list.filter(t => !t.need || window[t.need]).map(t => ({ k: 'x_wi_' + t.id, label: t.label })) : [];
    },
    ask(w, k) {
      if (!w || typeof k !== 'string' || !k.startsWith('x_wi_')) return null;
      const t = (D.TEACH[w.name] || []).find(q => 'x_wi_' + q.id === k);
      if (!t) return null;
      const key = w.name + ':' + t.id,
        n = (N[key] = (N[key] || 0) + 1);
      return {
        text: [t.lines[(n - 1) % t.lines.length]],
        after: () => teach(pick(t, n), w.name === 'hubert' ? 'Hubert' : 'Ronald'),
      };
    },
  });
  return { VIL, pick, teach };
})();
window.WLEHRER = WLEHRER;
