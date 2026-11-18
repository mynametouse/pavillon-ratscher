// ===================== feat/mehrspieler: the way the messages go – a room of browsers over the internet, or two windows of one browser (NETZRAUM) =====================
// The browsers talk to each other directly (WebRTC data channels) and find each other through public Nostr relays: dist/lazy/raum.js,
// Trystero (MIT), the same package as the zombie night's (zombie/z_netz.js) – no server of our own, nothing to pay. For the tests,
// ?lokal=1 joins through a BroadcastChannel instead: the same messages between pages of one browser, without the relays.
//   const T = await NETZRAUM.open({ app, code, lokal, actions: ['hi', 'st', 'ev'] })
//   T.id · T.peers (Set) · T.on(kind, fn(data, from)) · T.send(kind, data, to?) · T.onJoin = id => … · T.onLeave = id => … · T.start() · T.leave()
// Later steps only change what is passed here: NETZRAUM.ice (an RTCConfiguration with TURN servers) and NETZRAUM.turn (Trystero's
// turnConfig) go into every room; a server of our own would be one more way next to these two.
export const NETZRAUM = (() => {
  const S = { ice: null, turn: null, opened: 0, err: null };
  // two windows of one browser: a BroadcastChannel, with a hello so each knows the others
  function lokal(app, code) {
    const handlers = {},
      peers = new Set(),
      id = 'p' + Math.random().toString(36).slice(2, 10),
      bc = new BroadcastChannel(app + '-' + code);
    const T = { id, peers, handlers, onJoin: null, onLeave: null, lokal: true };
    T.on = (k, f) => (handlers[k] = f);
    bc.onmessage = ev => {
      const m = ev.data;
      if (!m || m.from === id || (m.to && m.to !== id)) return;
      if (m.type === '_hello' || m.type === '_ack') {
        if (!peers.has(m.from)) {
          peers.add(m.from);
          if (T.onJoin) T.onJoin(m.from);
        }
        if (m.type === '_hello') bc.postMessage({ from: id, to: m.from, type: '_ack' });
        return;
      }
      if (m.type === '_bye') {
        if (peers.delete(m.from) && T.onLeave) T.onLeave(m.from);
        return;
      }
      const h = handlers[m.type];
      if (h) h(m.data, m.from);
    };
    T.send = (type, data, to) => {
      try {
        bc.postMessage({ from: id, to: to || null, type, data });
      } catch (e) {}
    };
    T.leave = () => {
      try {
        bc.postMessage({ from: id, type: '_bye' });
        bc.close();
      } catch (e) {}
    };
    T.start = () => bc.postMessage({ from: id, type: '_hello' });
    return T;
  }
  // the internet: Trystero over Nostr
  async function internet(app, code, actions) {
    const mod = await import(new URL('lazy/raum.js', document.baseURI).href);
    const cfg = { appId: app, password: 'pr-' + app + '-' + code };
    if (S.ice) cfg.rtcConfig = S.ice;
    if (S.turn) cfg.turnConfig = S.turn;
    const R = mod.joinRoom(cfg, 'nz-' + code);
    const handlers = {},
      peers = new Set();
    const T = { id: mod.selfId, peers, handlers, onJoin: null, onLeave: null, lokal: false };
    T.on = (k, f) => (handlers[k] = f);
    const acts = {};
    for (const k of actions) {
      // (Trystero: an action's name has at most 12 bytes)
      const a = R.makeAction(k);
      a.onMessage = (data, meta) => {
        const h = handlers[k];
        if (h) h(data, (meta && meta.peerId) || meta);
      };
      acts[k] = a;
    }
    T.send = (type, data, to) => {
      const a = acts[type];
      if (!a) return;
      try {
        const p = a.send(data, to ? { target: to } : undefined);
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    };
    R.onPeerJoin = p => {
      peers.add(p);
      if (T.onJoin) T.onJoin(p);
    };
    R.onPeerLeave = p => {
      peers.delete(p);
      if (T.onLeave) T.onLeave(p);
    };
    T.leave = () => {
      try {
        R.leave();
      } catch (e) {}
    };
    T.start = () => {};
    return T;
  }
  async function open(o) {
    const app = o.app || 'pavillon-ratscher-netz-1',
      code = o.code,
      actions = o.actions || ['hi', 'st', 'ev'];
    S.opened++;
    try {
      return o.lokal ? lokal(app, code) : await internet(app, code, actions);
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
      throw e;
    }
  }
  return Object.assign(S, { open });
})();
window.NETZRAUM = NETZRAUM;
