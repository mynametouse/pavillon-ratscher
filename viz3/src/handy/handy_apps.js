// ===================== handy: the standard apps of the shared phone (HANDY.std) =====================
// Generic renderers fed by the world (HANDY.welt cfg.daten / cfg.aktionen, see handy/handy.js): Nachrichten (threads → a conversation with
// bubbles, times, read ticks, typing dots, photos, voice notes, reply chips like a game's dialogue answers), Telefon (favourites, recents,
// contacts, a contact's card → the call screen), Kamera (the viewfinder over the real picture), Fotos (what the camera took), Karte (the
// world's places around one, a waypoint), Feed (posts with pictures, LIVE, likes, comments, „Auf der Karte zeigen“), Bank, Notizen (with
// their sources), Einstellungen (sounds, read aloud, wallpaper, what is still locked), Uhr (the world's time, a stopwatch). Everything
// scrolls from top to bottom; every class is hy-… (a few old names – msg, neu, po, nt, nz – stay as hooks for the tests of the first world).
import { HANDY } from './handy.js';
export const HANDYAPPS = (() => {
  const esc = HANDY.esc,
    hhmm = HANDY.hhmm;
  const CSS = `
.hy-leer{text-align:center;opacity:.55;padding:14cqmin 6cqmin;line-height:1.5}
.hy-zeile{display:flex;align-items:center;gap:3cqmin;width:100%;padding:2.6cqmin .6cqmin;border-bottom:.3cqmin solid rgba(255,255,255,.07);text-align:left}
.hy-zeile>div{flex:1;min-width:0}
.hy-zeile b{display:flex;justify-content:space-between;gap:2cqmin;font-weight:600;font-size:4.2cqmin}
.hy-zeile b time{flex:none;font-weight:400;font-size:3.2cqmin;opacity:.55}
.hy-zeile small{display:block;font-size:3.6cqmin;opacity:.62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.4cqmin}
.hy-zeile.hy-ung small{opacity:.95;color:#fff}
.hy-zeile em{flex:none;font-style:normal;min-width:5.4cqmin;height:5.4cqmin;border-radius:3cqmin;background:var(--hy-ak,#0a84ff);color:#fff;font:700 3.2cqmin/5.4cqmin system-ui;text-align:center;padding:0 1.3cqmin}
.hy-zeile em.hy-grau{background:#48484a}
.hy-zeile .hy-pf{flex:none;opacity:.35;font-size:5cqmin}
.hy-faden{display:flex;flex-direction:column;gap:1cqmin;padding-bottom:1cqmin}
.hy-ts{align-self:center;font-size:3cqmin;opacity:.5;margin:2.4cqmin 0 1cqmin}
.hy-sys{align-self:center;font-size:3.2cqmin;background:rgba(255,255,255,.08);border-radius:2.4cqmin;padding:1.4cqmin 3cqmin;margin:1.6cqmin 4cqmin;text-align:center;opacity:.8}
.hy-bl,.hy-br{position:relative;max-width:80%;padding:2.1cqmin 3.2cqmin 1.7cqmin;border-radius:5cqmin;font-size:4cqmin;line-height:1.33;word-wrap:break-word}
.hy-bl{align-self:flex-start;background:#262629;border-bottom-left-radius:1.6cqmin}
.hy-br{align-self:flex-end;background:var(--hy-ak,#0a84ff);color:#fff;border-bottom-right-radius:1.6cqmin}
.hy-bl.neu{box-shadow:0 0 0 .5cqmin rgba(77,163,255,.55)}
.hy-bl>u{display:block;text-decoration:none;font-size:3.2cqmin;font-weight:650;margin-bottom:.4cqmin}
.hy-bl>time,.hy-br>time{float:right;font-size:2.8cqmin;opacity:.55;margin:1.4cqmin 0 -.6cqmin 2.4cqmin;font-variant-numeric:tabular-nums}
.hy-br>time i{font-style:normal;margin-left:.8cqmin;letter-spacing:-.25em}
.hy-br>time i.hy-gl{color:#9ff0ff;opacity:1}
.hy-bl img,.hy-br img{display:block;width:100%;border-radius:3.4cqmin;margin:-.6cqmin 0 1.4cqmin;aspect-ratio:4/3;object-fit:cover;background:#000}
.hy-sp{display:flex;align-items:center;gap:1.6cqmin;min-width:44cqmin}
.hy-sp i{font-style:normal;font-size:4cqmin}
.hy-sp span{flex:1;display:flex;align-items:center;gap:.5cqmin;height:7cqmin}
.hy-sp span b{flex:1;background:currentColor;opacity:.7;border-radius:1cqmin;min-height:1cqmin}
.hy-tippt{align-self:flex-start;background:#262629;border-radius:5cqmin;padding:3cqmin 4cqmin;display:flex;gap:1.2cqmin}
.hy-tippt i{width:1.8cqmin;height:1.8cqmin;border-radius:50%;background:#aaa;animation:hyDot 1.2s infinite}
.hy-tippt i:nth-child(2){animation-delay:.18s} .hy-tippt i:nth-child(3){animation-delay:.36s}
@keyframes hyDot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-.8cqmin)}}
.hy-comp{display:flex;align-items:center;gap:2cqmin;margin-top:2cqmin}
.hy-comp span{flex:1;border:.3cqmin solid rgba(255,255,255,.18);border-radius:99px;padding:2.2cqmin 3.6cqmin;font-size:3.6cqmin;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hy-seg{display:flex;background:rgba(255,255,255,.1);border-radius:2.6cqmin;padding:.7cqmin;margin:0 0 2.6cqmin}
.hy-seg button{flex:1;text-align:center!important;padding:1.6cqmin 0!important;border-radius:2cqmin!important;font-size:3.5cqmin;font-weight:600;opacity:.75}
.hy-seg button[aria-pressed="true"]{background:rgba(255,255,255,.2)!important;opacity:1}
.hy-karte{display:flex;flex-direction:column;align-items:center;gap:2.4cqmin;padding:4cqmin 0}
.hy-karte .hy-av{width:24cqmin;height:24cqmin;font-size:9cqmin}
.hy-karte b{font-size:6.4cqmin;font-weight:600}
.hy-karte small{opacity:.6}
.hy-knr{display:flex;gap:3cqmin;margin-top:2cqmin}
.hy-knr button{display:flex;flex-direction:column;align-items:center;gap:1cqmin;padding:2.6cqmin 4.6cqmin!important;border-radius:3.6cqmin!important;background:rgba(255,255,255,.1)!important;
  color:var(--hy-ak,#0a84ff);font-size:3.3cqmin}
.hy-knr svg{width:6.4cqmin;height:6.4cqmin;fill:currentColor}
.hy-pfeil{font-style:normal;font-size:3.6cqmin;margin-right:1cqmin}
.hy-pfeil.hy-rot{color:#ff453a}
.hy-gitter{display:grid;grid-template-columns:repeat(3,1fr);gap:.8cqmin;margin:0 -2.6cqmin}
.hy-gitter button{aspect-ratio:1;background-color:#222;background-position:center;background-size:cover;background-repeat:no-repeat}
.hy-bild{width:100%;border-radius:2cqmin;display:block}
.hy-po{padding:3cqmin 0 3.4cqmin;border-bottom:.3cqmin solid rgba(255,255,255,.08)}
.hy-po h5{margin:0 0 1.6cqmin;display:flex;align-items:center;gap:2.2cqmin;font-size:3.9cqmin;font-weight:650}
.hy-po h5 .hy-av{width:8.6cqmin;height:8.6cqmin;font-size:3.4cqmin}
.hy-po h5 time{font-weight:400;opacity:.5;font-size:3.2cqmin}
.hy-po h5 u{text-decoration:none;margin-left:auto;background:#ff3b30;color:#fff;border-radius:1.2cqmin;padding:.5cqmin 1.8cqmin;font-size:2.9cqmin;font-weight:800;letter-spacing:.06em}
.hy-po img{display:block;width:calc(100% + 6.8cqmin);margin:2cqmin -3.4cqmin;aspect-ratio:16/10;object-fit:cover;background:#000}
.hy-pl{display:flex;gap:5cqmin;font-size:3.5cqmin;opacity:.8;margin-top:1.6cqmin}
.hy-km{font-size:3.6cqmin;line-height:1.35;margin-top:1.2cqmin;opacity:.88}
.hy-km b{font-weight:650;margin-right:1.4cqmin}
.hy-po button[data-ort]{margin-top:2.2cqmin;border-radius:99px!important;background:rgba(255,255,255,.12)!important;padding:1.8cqmin 3.4cqmin!important;font-size:3.4cqmin;
  color:var(--hy-ak,#4da3ff)}
.hy-bk{margin:1cqmin 0 4cqmin;padding:5cqmin 5cqmin 4.4cqmin;border-radius:5cqmin;background:linear-gradient(135deg,#3b3a8f,#1e1d4f 60%,#121133);box-shadow:inset 0 0 0 .3cqmin rgba(255,255,255,.08)}
.hy-bk small{display:block;font-size:3.3cqmin;opacity:.7}
.hy-bk strong{display:block;font-size:10cqmin;font-weight:600;letter-spacing:-.01em;margin:1.4cqmin 0 3cqmin;font-variant-numeric:tabular-nums}
.hy-bk span{font:500 3.4cqmin/1.2 ui-monospace,monospace;opacity:.6;letter-spacing:.08em}
.hy-bw{display:flex;justify-content:space-between;gap:3cqmin;padding:2.6cqmin .4cqmin;border-bottom:.3cqmin solid rgba(255,255,255,.07)}
.hy-bw small{display:block;opacity:.55;font-size:3.2cqmin}
.hy-bw>b{font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.hy-bw .hy-plus{color:#30d158}
.hy-h6{font-size:3.2cqmin;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.5;margin:4cqmin 0 1.4cqmin}
.hy-nt{display:block;width:100%;text-align:left;padding:3cqmin .6cqmin;border-bottom:.3cqmin solid rgba(255,255,255,.08)}
.hy-nt b{display:block;font-size:4.2cqmin;font-weight:600}
.hy-nt small{display:block;font-size:3.5cqmin;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.5cqmin}
.hy-nz p{margin:0 0 2.6cqmin}
.hy-nz a{display:block;color:var(--hy-ak,#4da3ff);font-size:3.6cqmin;margin-bottom:2cqmin;word-break:break-word}
.hy-map{position:relative;margin:0 -3.4cqmin 2cqmin;aspect-ratio:1/0.82;background:#1b2229;overflow:hidden}
.hy-map svg{position:absolute;inset:0;width:100%;height:100%}
.hy-map b{position:absolute;left:3cqmin;top:2.4cqmin;font-size:3cqmin;opacity:.6}
.hy-ein{display:flex;align-items:center;justify-content:space-between;gap:3cqmin;width:100%;padding:3cqmin .6cqmin;border-bottom:.3cqmin solid rgba(255,255,255,.07);text-align:left}
.hy-ein i{flex:none;position:relative;width:12cqmin;height:7.2cqmin;border-radius:4cqmin;background:#3a3a3c;transition:background .2s}
.hy-ein i::after{content:'';position:absolute;left:.7cqmin;top:.7cqmin;width:5.8cqmin;height:5.8cqmin;border-radius:50%;background:#fff;transition:transform .2s}
.hy-ein[aria-pressed="true"] i{background:#30d158}
.hy-ein[aria-pressed="true"] i::after{transform:translateX(4.8cqmin)}
.hy-tps{display:flex;gap:3cqmin;padding:3cqmin .6cqmin}
.hy-tps button{width:14cqmin;height:24cqmin;border-radius:2.6cqmin!important;background-size:cover!important;box-shadow:0 0 0 .4cqmin rgba(255,255,255,.15)}
.hy-tps button[aria-pressed="true"]{box-shadow:0 0 0 .8cqmin var(--hy-ak,#0a84ff)}
.hy-uhr{text-align:center;padding:8cqmin 0 4cqmin}
.hy-uhr b{display:block;font-size:20cqmin;font-weight:200;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.hy-uhr small{opacity:.6}
.hy-stopp{text-align:center;padding:6cqmin 0}
.hy-stopp b{display:block;font-size:12cqmin;font-weight:250;font-variant-numeric:tabular-nums;margin-bottom:4cqmin}
.hy-stopp button{width:20cqmin;height:20cqmin;border-radius:50%!important;margin:0 3cqmin;font-size:3.8cqmin;background:rgba(255,255,255,.12)!important}
.hy-stopp button.hy-los{background:rgba(48,209,88,.25)!important;color:#30d158}
.hy-stopp button.hy-halt{background:rgba(255,69,58,.25)!important;color:#ff453a}
`;
  if (typeof document !== 'undefined') {
    const st = document.createElement('style');
    st.id = 'hy-apps-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const P = {
    nachr:
      'M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.6 3.4 6.1L4.5 21l4.3-2.2c1 .3 2.1.4 3.2.4 5.5 0 10-3.6 10-8.2S17.5 3 12 3z',
    tel: 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z',
    kamera:
      'M9 4l-1.8 2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-3.2L15 4zm3 4.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
    fotos:
      'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm0 13h14l-4.5-6-3.5 4.5L8.5 12zM8.5 6.5a2 2 0 100 4 2 2 0 000-4z',
    karte: 'M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 4.3a2.7 2.7 0 110 5.4 2.7 2.7 0 010-5.4z',
    feed: 'M4 4h7v7H4zm9 0h7v4h-7zm0 6h7v10h-7zM4 13h7v7H4z',
    bank: 'M12 2l10 5v2H2V7zM4 10h3v7H4zm6.5 0h3v7h-3zM17 10h3v7h-3zM2 19h20v3H2z',
    notiz: 'M5 2h10l5 5v15H5zm9 1.5V8h4.5zM8 11h9v1.6H8zm0 3.5h9v1.6H8zm0 3.5h6v1.6H8z',
    einst:
      'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM10.3 2h3.4l.5 2.6 1.6.7 2.2-1.5 2.4 2.4-1.5 2.2.7 1.6 2.6.5v3.4l-2.6.5-.7 1.6 1.5 2.2-2.4 2.4-2.2-1.5-1.6.7-.5 2.6h-3.4l-.5-2.6-1.6-.7-2.2 1.5-2.4-2.4 1.5-2.2-.7-1.6L2 13.7v-3.4l2.6-.5.7-1.6-1.5-2.2 2.4-2.4 2.2 1.5 1.6-.7z',
    uhr: 'M12 2a10 10 0 110 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm-1 3h2v5.2l3.6 2.1-1 1.7L11 13.4z',
    nachricht: 'M3 5h18v12H8l-5 4z',
  };
  HANDY.ICONS = P;
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill-rule="evenodd"><path d="${d}"/></svg>`;
  const arr = v => (Array.isArray(v) ? v : []);
  const fn = (o, k, ...a) => {
    try {
      return o && typeof o[k] === 'function' ? o[k](...a) : undefined;
    } catch (e) {
      console.warn('handy app', k, e);
      return undefined;
    }
  };
  // minutes of the game → a short time; the day before → „gestern“
  const wann = (t, jetzt) => {
    if (!Number.isFinite(t)) return '';
    const d = Math.floor(jetzt / 1440) - Math.floor(t / 1440);
    return d <= 0 || !Number.isFinite(jetzt) || jetzt < 2880 ? hhmm(t) : d === 1 ? 'Gestern' : 'vor ' + d + ' Tagen';
  };
  // ---------------- Nachrichten ----------------
  const NAMEC = ['#ff9f0a', '#64d2ff', '#30d158', '#bf5af2', '#ff6482', '#ffd60a', '#7d7aff', '#ac8e68'];
  const farbeVon = n => NAMEC[(String(n).charCodeAt(0) + String(n).length * 3) % NAMEC.length];
  const wellen = n =>
    Array.from(
      { length: 22 },
      (_, i) => `<b style="height:${(28 + 62 * Math.abs(Math.sin(i * 1.7 + n))) | 0}%"></b>`
    ).join('');
  HANDY.std('nachrichten', {
    name: 'Nachrichten',
    icon: P.nachr,
    farbe: ['#64d2ff', '#0a84ff'],
    render(el, c, view, arg) {
      const d = c.daten,
        jetzt = c.zeit();
      if (view !== 'faden') {
        const l = arr(fn(d, 'threads'))
          .slice()
          .sort((a, b) => ((b.letzte && b.letzte.t) || 0) - ((a.letzte && a.letzte.t) || 0));
        el.innerHTML = l.length
          ? l
              .map(t => {
                const L = t.letzte || {},
                  n = t.neu | 0;
                return (
                  `<button type="button" class="hy-zeile${n ? ' hy-ung' : ''}" data-hy="t:${esc(t.id)}">${c.av(t.name, { bild: t.bild })}` +
                  `<div><b><span>${esc(t.name)}</span><time>${esc(wann(L.t, jetzt))}</time></b><small>${L.aus ? 'Du: ' : L.von && t.gruppe ? esc(L.von) + ': ' : ''}${esc(L.text || (t.gruppe ? 'Gruppe' : ''))}</small></div>` +
                  (n ? `<em class="${t.stumm ? 'hy-grau' : ''}">${n > 99 ? '99+' : n}</em>` : '') +
                  '</button>'
                );
              })
              .join('')
          : '<p class="hy-leer">Keine Nachrichten.</p>';
        return {
          titel: 'Nachrichten',
          sub: l.length ? l.length + (l.length === 1 ? ' Unterhaltung' : ' Unterhaltungen') : '',
        };
      }
      const t = arr(fn(d, 'threads')).find(q => q.id === arg) || { id: arg, name: String(arg) },
        l = arr(fn(d, 'nachrichten', arg));
      let h = '<div class="hy-faden">',
        prevT = -1e9,
        prevVon = null;
      for (const m of l) {
        if (Number.isFinite(m.t) && m.t - prevT > 30) h += `<div class="hy-ts">${esc(wann(m.t, jetzt))}</div>`;
        prevT = Number.isFinite(m.t) ? m.t : prevT;
        if (m.sys) {
          h += `<div class="hy-sys">${esc(m.text)}</div>`;
          prevVon = null;
          continue;
        }
        const inhalt =
          (m.img ? `<img src="${esc(m.img)}" alt="">` : '') +
          (m.sprach
            ? `<div class="hy-sp"><i>▶</i><span>${wellen(String(m.text || '').length)}</span><small>0:${String(Math.round(m.sprach)).padStart(2, '0')}</small></div>`
            : esc(m.text || ''));
        if (m.aus)
          h += `<div class="hy-br msg">${inhalt}<time>${esc(hhmm(m.t || 0))}<i class="${m.gelesen ? 'hy-gl' : ''}">✓✓</i></time></div>`;
        else
          h +=
            `<div class="hy-bl msg${m.neu ? ' neu' : ''}">` +
            (t.gruppe && m.von !== prevVon ? `<u style="color:${farbeVon(m.von)}">${esc(m.von)}</u>` : '') +
            `${inhalt}<time>${esc(hhmm(m.t || 0))}</time></div>`;
        prevVon = m.aus ? null : m.von;
      }
      if (fn(d, 'tippt', arg)) h += '<div class="hy-tippt"><i></i><i></i><i></i></div>';
      if (!l.length) h += '<p class="hy-leer">Noch keine Nachrichten.</p>';
      el.innerHTML = h + '</div>';
      fn(d, 'gelesen', arg);
      return {
        titel: t.name,
        sub: t.gruppe
          ? (t.mitglieder ? t.mitglieder + ' Mitglieder' : 'Gruppe') + (t.stumm ? ' · stumm' : '')
          : t.status || '',
        unten: true,
        zurueck: 'Chats',
      };
    },
    fuss(el, c, view, arg) {
      if (view !== 'faden') return;
      const ch = arr(fn(c.akt, 'antworten', arg));
      if (ch.length)
        el.innerHTML =
          '<div class="hy-chips">' +
          ch
            .slice(0, 4)
            .map(
              (a, i) =>
                `<button type="button" class="hy-chip" data-hy="a:${i}"><kbd>${i + 1}</kbd>${esc(a.text)}</button>`
            )
            .join('') +
          '</div>';
      else {
        const hw = fn(c.daten, 'hinweis', arg);
        el.innerHTML = `<div class="hy-comp"><span>${esc(hw || 'Nachricht')}</span></div>`;
      }
    },
    klick(k, b, c) {
      if (k.startsWith('t:')) return c.zu('faden', k.slice(2));
      if (k.startsWith('a:')) {
        const id = HANDY.S.stack[HANDY.S.stack.length - 1].arg,
          a = arr(fn(c.akt, 'antworten', id))[+k.slice(2)];
        if (!a) return false;
        fn(c.akt, 'antwort', id, a);
        c.ton('senden');
        c.neu();
        const body = HANDY.el().querySelector('#hybody');
        if (body) body.scrollTop = body.scrollHeight;
        return false;
      }
      return false;
    },
    unten: true,
  });
  // ---------------- Telefon ----------------
  const tel = { tab: 'fav' };
  HANDY.std('telefon', {
    name: 'Telefon',
    icon: P.tel,
    farbe: ['#5ee67a', '#1fa23a'],
    render(el, c, view, arg) {
      const d = c.daten,
        ks = arr(fn(d, 'kontakte')),
        k = id => ks.find(q => q.id === id);
      if (view === 'kontakt') {
        const K = k(arg) || { id: arg, name: String(arg) };
        el.innerHTML =
          `<div class="hy-karte">${c.av(K.name, { bild: K.bild })}<b>${esc(K.name)}</b><small>${esc(K.rolle || '')}${K.nummer ? ' · ' + esc(K.nummer) : ''}</small>` +
          `<div class="hy-knr"><button type="button" data-hy="ruf:${esc(K.id)}">${svg(P.tel)}Anrufen</button>` +
          (K.chat ? `<button type="button" data-hy="chat:${esc(K.chat)}">${svg(P.nachricht)}Nachricht</button>` : '') +
          '</div></div>' +
          (K.info ? `<p style="opacity:.7;font-size:3.6cqmin;text-align:center">${esc(K.info)}</p>` : '');
        return { titel: '', zurueck: 'Kontakte' };
      }
      const seg =
        '<div class="hy-seg">' +
        [
          ['fav', 'Favoriten'],
          ['zul', 'Zuletzt'],
          ['alle', 'Kontakte'],
        ]
          .map(([id, n]) => `<button type="button" data-hy="seg:${id}" aria-pressed="${tel.tab === id}">${n}</button>`)
          .join('') +
        '</div>';
      const zeile = (K, rechts, sub) =>
        `<button type="button" class="hy-zeile" data-hy="${rechts ? 'ruf' : 'k'}:${esc(K.id)}">${c.av(K.name, { bild: K.bild })}` +
        `<div><b><span>${esc(K.name)}</span></b><small>${sub || esc(K.rolle || 'Mobil')}</small></div><span class="hy-pf">${rechts ? '☏' : '›'}</span></button>`;
      let h = '';
      if (tel.tab === 'zul') {
        const l = arr(fn(d, 'anrufe')).slice().reverse();
        h = l.length
          ? l
              .map(a => {
                const K = k(a.id) || { id: a.id || a.wer, name: a.wer || '?' },
                  pf =
                    a.art === 'verpasst'
                      ? '<i class="hy-pfeil hy-rot">↙</i>verpasst'
                      : a.art === 'ein'
                        ? '<i class="hy-pfeil">↙</i>eingehend'
                        : '<i class="hy-pfeil">↗</i>ausgehend';
                return zeile(
                  K,
                  true,
                  pf +
                    ' · ' +
                    esc(hhmm(a.t || 0)) +
                    (a.d ? ' · ' + Math.floor(a.d / 60) + ':' + String(a.d % 60).padStart(2, '0') : '')
                );
              })
              .join('')
          : '<p class="hy-leer">Noch keine Anrufe.</p>';
      } else {
        const l =
          tel.tab === 'fav'
            ? ks.filter(q => q.fav)
            : ks.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
        h = l.length
          ? l.map(K => zeile(K, tel.tab === 'fav')).join('')
          : `<p class="hy-leer">${tel.tab === 'fav' ? 'Keine Favoriten.' : 'Keine Kontakte.'}</p>`;
      }
      el.innerHTML = seg + h;
      return { titel: 'Telefon', sub: ks.length + ' Kontakte' };
    },
    klick(k, b, c) {
      const [a, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
      if (a === 'seg') {
        tel.tab = id;
        return c.neu();
      }
      if (a === 'k') return c.zu('kontakt', id);
      if (a === 'chat') return c.open('nachrichten', { view: 'faden', arg: id });
      if (a === 'ruf') {
        const K = arr(fn(c.daten, 'kontakte')).find(q => q.id === id) || { id, name: id };
        c.anruf(K);
        return false;
      }
      return false;
    },
  });
  // ---------------- Kamera and Fotos ----------------
  HANDY.std('kamera', {
    name: 'Kamera',
    icon: P.kamera,
    farbe: ['#9a9aa0', '#3a3a3c'],
    // the camera is the viewfinder over the picture, not a screen in the phone
    oeffnen(c) {
      c.sucher(true, { von: 'handy' });
      return false;
    },
    render(el) {
      el.innerHTML = '<p class="hy-leer">Die Kamera ist offen.</p>';
      return {};
    },
  });
  HANDY.std('fotos', {
    name: 'Fotos',
    icon: P.fotos,
    farbe: ['#ffcf5a', '#ff7a3d'],
    render(el, c, view, arg) {
      const l = c.fotos();
      if (view === 'foto') {
        const f = l[arg];
        el.innerHTML = f
          ? `<img class="hy-bild" src="${esc(f.img)}" alt="Foto"><p style="opacity:.6;font-size:3.4cqmin">${esc(hhmm(f.t || 0))}${f.ort ? ' · ' + esc(f.ort) : ''}</p>` +
            (c.akt.teilen
              ? `<button type="button" class="hy-chip" data-hy="teilen:${arg}">Im Feed teilen</button>`
              : '')
          : '<p class="hy-leer">Das Foto ist weg.</p>';
        return { titel: 'Foto', zurueck: 'Fotos' };
      }
      el.innerHTML = l.length
        ? '<div class="hy-gitter">' +
          l
            .map((f, i) => [f, i])
            .reverse()
            .map(
              ([f, i]) =>
                `<button type="button" data-hy="f:${i}" style="background-image:url('${esc(f.img)}')" aria-label="Foto"></button>`
            )
            .join('') +
          '</div>'
        : '<p class="hy-leer">Noch keine Fotos.<br>Kamera öffnen und auslösen.</p>';
      return { titel: 'Fotos', sub: l.length ? l.length + (l.length === 1 ? ' Foto' : ' Fotos') : '' };
    },
    klick(k, b, c) {
      if (k.startsWith('f:')) return c.zu('foto', +k.slice(2));
      if (k.startsWith('teilen:')) {
        const f = c.fotos()[+k.slice(7)];
        if (f) fn(c.akt, 'teilen', f.img, f);
        c.mitteilung({ app: 'feed', von: 'Feed', text: 'Geteilt.', kurz: true, still: true });
        return true;
      }
      return false;
    },
  });
  // ---------------- Karte ----------------
  const RICHT = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
  const weit = d => (d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km');
  HANDY.std('karte', {
    name: 'Karte',
    icon: P.karte,
    farbe: ['#63e6be', '#12866a'],
    render(el, c) {
      const d = c.daten,
        w = fn(d, 'wo') || [0, 0],
        ziel = fn(d, 'ziel'),
        l = arr(fn(d, 'orte'))
          .map(o => {
            const dx = o.pos[0] - w[0],
              dy = o.pos[1] - w[1];
            return Object.assign({}, o, {
              d: Math.hypot(dx, dy),
              dx,
              dy,
              r: RICHT[Math.round((((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360) / 45) % 8],
            });
          })
          .sort((a, b) => a.d - b.d);
      // the map: north up, the nearest places in reach, oneself in the middle
      const near = l.slice(0, 7),
        R = Math.max(250, ...near.map(o => o.d)) * 1.15,
        X = v => 50 + (v / R) * 46,
        Y = v => 41 - (v / R) * 37.7;
      let g = '';
      for (let i = 1; i <= 3; i++)
        g += `<circle cx="50" cy="41" r="${(i * 46) / 3}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".3"/>`;
      g += '<path d="M50 0V82M0 41H100" stroke="rgba(255,255,255,.05)" stroke-width=".3"/>';
      for (const o of near) {
        const on = ziel && ziel === o.id;
        g +=
          `<circle cx="${X(o.dx).toFixed(1)}" cy="${Y(o.dy).toFixed(1)}" r="${on ? 2.4 : 1.6}" fill="${on ? '#ffd60a' : '#ff6b5a'}" stroke="#fff" stroke-width=".5"/>` +
          `<text x="${(X(o.dx) + 2.6).toFixed(1)}" y="${(Y(o.dy) + 1.1).toFixed(1)}" font-size="3" fill="rgba(255,255,255,.82)">${esc(o.name)}</text>`;
      }
      g +=
        '<circle cx="50" cy="41" r="2.6" fill="#0a84ff" stroke="#fff" stroke-width=".8"/><circle cx="50" cy="41" r="6" fill="rgba(10,132,255,.18)"/>';
      el.innerHTML =
        `<div class="hy-map"><svg viewBox="0 0 100 82">${g}</svg><b>N ↑ · ${esc(weit(R))}</b></div>` +
        (l.length
          ? l
              .map(
                o =>
                  `<button type="button" class="hy-zeile" data-hy="z:${esc(o.id)}"><div><b><span>${esc(o.name)}</span><time>${esc(weit(o.d))}</time></b>` +
                  `<small>${ziel === o.id ? '★ Ziel · ' : ''}${esc(o.art || 'Ort')} · nach ${o.r}</small></div><span class="hy-pf">›</span></button>`
              )
              .join('')
          : '<p class="hy-leer">Keine Orte.</p>');
      return { titel: 'Karte', sub: fn(d, 'ortName') || '' };
    },
    klick(k, b, c) {
      if (!k.startsWith('z:')) return false;
      const id = k.slice(2),
        o = arr(fn(c.daten, 'orte')).find(q => q.id === id);
      if (!o) return false;
      fn(c.akt, 'ziel', o);
      c.mitteilung({ app: 'karte', von: 'Karte', text: 'Route zu ' + o.name + ' gesetzt.', kurz: true, still: true });
      c.neu();
      return true;
    },
  });
  // ---------------- Feed ----------------
  HANDY.std('feed', {
    name: 'Feed',
    icon: P.feed,
    farbe: ['#ff7a9a', '#d0245a'],
    render(el, c) {
      const l = arr(fn(c.daten, 'feed')),
        jetzt = c.zeit();
      el.innerHTML = l.length
        ? l
            .map(
              q =>
                `<div class="hy-po po"><h5>${c.av(q.wer)}<span>${esc(q.wer)}</span><time>${esc(wann(q.t, jetzt))}</time>${q.live ? '<u>LIVE</u>' : ''}</h5>` +
                esc(q.text) +
                (q.img ? `<img src="${esc(q.img)}" alt="">` : '') +
                (q.likes != null
                  ? `<div class="hy-pl"><span>♥ ${q.likes | 0}</span><span>💬 ${arr(q.kom).length}</span></div>`
                  : '') +
                arr(q.kom)
                  .map(k => `<div class="hy-km"><b>${esc(k[0])}</b>${esc(k[1])}</div>`)
                  .join('') +
                (q.ort && q.ortName
                  ? `<div><button type="button" data-hy="ort:${esc(q.ort)}" data-ort="${esc(q.ort)}">Auf der Karte zeigen · ${esc(q.ortName)}</button></div>`
                  : '') +
                '</div>'
            )
            .join('')
        : '<p class="hy-leer">Nichts los hier.</p>';
      fn(c.daten, 'feedGelesen');
      return { titel: c.cfg.feedName || 'Feed', sub: c.cfg.feedSub || '' };
    },
    klick(k, b, c) {
      if (!k.startsWith('ort:')) return false;
      fn(c.akt, 'zeigOrt', k.slice(4));
      return true;
    },
  });
  // ---------------- Bank ----------------
  HANDY.std('bank', {
    name: 'Bank',
    icon: P.bank,
    farbe: ['#7d7aff', '#3634a3'],
    render(el, c) {
      const b = fn(c.daten, 'bank') || {},
        l = arr(b.buchungen);
      el.innerHTML =
        `<div class="hy-bk"><small>Kontostand</small><strong>${esc(b.stand != null ? b.stand + ' ' + (b.waehrung || '€') : '–')}</strong>` +
        `<span>${esc(b.konto || 'DE•• •••• •••• •••• 4711')}</span></div>` +
        (b.claim ? `<p style="opacity:.6;font-size:3.4cqmin;margin:0 0 2cqmin">${esc(b.claim)}</p>` : '') +
        '<div class="hy-h6">Umsätze</div>' +
        (l.length
          ? l
              .map(
                q =>
                  `<div class="hy-bw"><span>${esc(q.wer)}<small>${esc(hhmm(q.t || 0))} Uhr</small></span><b class="${/^\+/.test(q.text) ? 'hy-plus' : ''}">${esc(q.text)}</b></div>`
              )
              .join('')
          : '<p class="hy-leer">Noch keine Umsätze.</p>');
      return { titel: 'Bank', sub: b.name || '' };
    },
  });
  // ---------------- Notizen ----------------
  HANDY.std('notizen', {
    name: 'Notizen',
    icon: P.notiz,
    farbe: ['#ffe066', '#e0a800'],
    render(el, c, view, arg) {
      const l = arr(fn(c.daten, 'notizen'));
      if (view === 'notiz' && l[arg]) {
        const N = l[arg];
        el.innerHTML =
          '<div class="hy-nz nz">' +
          arr(N.zeilen)
            .map(z => `<p>${esc(z)}</p>`)
            .join('') +
          (arr(N.quellen).length
            ? '<div class="hy-h6">Quellen</div>' +
              arr(N.quellen)
                .map(q => `<a href="${esc(q[1])}" target="_blank" rel="noopener noreferrer">${esc(q[0])}</a>`)
                .join('')
            : '') +
          '</div>';
        return { titel: N.titel, zurueck: 'Notizen' };
      }
      el.innerHTML = l.length
        ? l
            .map(
              (n, i) =>
                `<button type="button" class="hy-nt nt" data-hy="n:${i}"><b>${esc(n.titel)}</b><small>${esc(arr(n.zeilen)[0] || '')}</small></button>`
            )
            .join('')
        : `<p class="hy-leer">${esc(c.cfg.notizenLeer || 'Noch keine Notizen.')}</p>`;
      return { titel: 'Notizen', sub: l.length + (l.length === 1 ? ' Notiz' : ' Notizen') };
    },
    klick(k, b, c) {
      return k.startsWith('n:') ? c.zu('notiz', +k.slice(2)) : false;
    },
  });
  // ---------------- Einstellungen ----------------
  HANDY.std('einstellungen', {
    name: 'Einstellungen',
    kurz: 'Einstell.',
    icon: P.einst,
    farbe: ['#a1a1a6', '#48484a'],
    render(el, c) {
      const E = HANDY.S.einst,
        tp = c.cfg.tapeten || null,
        zu = Object.keys(c.cfg.gesperrt || {}).filter(id => !HANDY.frei(id) && HANDY.S.apps[id]);
      const sw = (k, n, sub) =>
        `<button type="button" class="hy-ein" data-hy="e:${k}" aria-pressed="${!!E[k]}"><span>${n}${sub ? `<small style="display:block;opacity:.55;font-size:3.2cqmin">${sub}</small>` : ''}</span><i></i></button>`;
      el.innerHTML =
        '<div class="hy-h6">Töne und Mitteilungen</div>' +
        sw('toene', 'Töne', 'Tippen, Mitteilungen, Klingelton') +
        sw('vorlesen', 'Mitteilungen vorlesen', 'mit der Stimme des Spiels') +
        '<div class="hy-h6">Hintergrund</div><div class="hy-tps">' +
        [0, 1, 2, 3]
          .filter(i => !tp || tp[i])
          .map(
            i =>
              `<button type="button" data-hy="tp:${i}" aria-pressed="${E.tapete === i}" style="background:${esc(HANDY.tapete(i))}"></button>`
          )
          .join('') +
        '</div>' +
        (zu.length
          ? '<div class="hy-h6">Kommt später</div>' +
            zu
              .map(
                id =>
                  `<div class="hy-zeile"><div><b><span>${esc(HANDY.S.apps[id].name)}</span></b><small>${esc(c.cfg.gesperrt[id] || 'Kommt später.')}</small></div><span class="hy-pf">🔒</span></div>`
              )
              .join('')
          : '') +
        '<div class="hy-h6">Über dieses Handy</div>' +
        `<div class="hy-bw"><span>Welt</span><b>${esc(c.cfg.name || '–')}</b></div>` +
        `<div class="hy-bw"><span>Fotos</span><b>${c.fotos().length}</b></div>` +
        '<div class="hy-bw"><span>Gerät</span><b>ohne Marke</b></div>';
      return { titel: 'Einstellungen' };
    },
    klick(k, b, c) {
      const E = HANDY.S.einst;
      if (k.startsWith('e:')) {
        const n = k.slice(2);
        E[n] = !E[n];
        HANDY.speichern();
      } else if (k.startsWith('tp:')) {
        E.tapete = +k.slice(3);
        HANDY.speichern();
        HANDY.layout(HANDY.S.layout);
      }
      c.neu();
      return true;
    },
  });
  // ---------------- Uhr ----------------
  const sw = { t0: 0, acc: 0, run: false };
  const swZeit = () => {
    const s = sw.acc + (sw.run ? (performance.now() - sw.t0) / 1000 : 0);
    return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + ',' + Math.floor((s % 1) * 10);
  };
  HANDY.std('uhr', {
    name: 'Uhr',
    icon: P.uhr,
    farbe: ['#3a3a3c', '#0b0b0c'],
    render(el, c) {
      el.innerHTML =
        `<div class="hy-uhr"><b>${esc(hhmm(c.zeit()))}</b><small>${esc(c.cfg.ortName || c.cfg.name || '')}</small></div>` +
        `<div class="hy-stopp"><b class="hy-sw">${swZeit()}</b><button type="button" data-hy="sw:null">Zurück&shy;setzen</button>` +
        `<button type="button" class="${sw.run ? 'hy-halt' : 'hy-los'}" data-hy="sw:los">${sw.run ? 'Stopp' : 'Start'}</button></div>`;
      return { titel: 'Uhr', sub: 'Stoppuhr' };
    },
    tick(dt, c) {
      const e = HANDY.el() && HANDY.el().querySelector('.hy-sw');
      if (e) e.textContent = swZeit();
      const u = HANDY.el() && HANDY.el().querySelector('.hy-uhr b');
      if (u) u.textContent = hhmm(c.zeit());
    },
    klick(k, b, c) {
      if (k === 'sw:los') {
        if (sw.run) sw.acc += (performance.now() - sw.t0) / 1000;
        else sw.t0 = performance.now();
        sw.run = !sw.run;
      } else {
        sw.run = false;
        sw.acc = 0;
      }
      c.neu();
      return true;
    },
  });
  return { P, wann };
})();
window.HANDYAPPS = HANDYAPPS;
