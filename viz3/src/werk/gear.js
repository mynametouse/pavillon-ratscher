// ---- personal protective equipment (PSA): taken once from the board in the workshop, then put on and off in its window (anywhere) ----
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { $ } from '../core/head.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { audio } from '../audio/audio.js';
import { PLAY, SFX } from '../game/play.js';
import { HUD } from '../game/hud.js';
import { AVATAR } from '../game/avatar.js';
export const GEAR = (() => {
  const LSK = 'pav-gear-v1';
  const IT = {
    brille: { slot: 'eyes', n: 'Schutzbrille', d: 'EN 166: gegen Späne und Splitter an Säge, Hobel und Schleifer.' },
    korb: {
      slot: 'eyes',
      n: 'Korbbrille (dicht)',
      d: 'Dicht anliegend: gegen Ammoniakdampf beim Räuchern und gegen Spritzer.',
    },
    ohr: {
      slot: 'ears',
      n: 'Kapselgehörschutz',
      d: 'SNR 30 dB: Tischkreissäge und Dickenhobel erreichen 95–100 dB(A) – ab 85 dB(A) Pflicht.',
    },
    ffp2: {
      slot: 'resp',
      n: 'FFP2-Maske',
      d: 'Eichen- und Buchenholzstaub gilt als krebserzeugend – beim Schleifen immer, auch mit Absaugung.',
    },
    abek: {
      slot: 'resp',
      n: 'Halbmaske ABEK1',
      d: 'Der grüne Filterteil K hält Ammoniak zurück – nur damit ans offene Räucherzelt.',
    },
    nitril: {
      slot: 'hands',
      n: 'Nitrilhandschuhe',
      d: 'Gegen Ammoniak, Leim und Öl auf der Haut. Nie an Maschinen mit drehendem Werkzeug – sie können eingezogen werden.',
    },
    // V16c2 forest gear for the chainsaw (world/fell.js): from the forest box at the tractor
    forsthelm: {
      slot: 'head',
      forest: true,
      n: 'Forsthelm mit Visier und Gehörschutz',
      d: 'Schutzhelm (EN 397) mit Gitter-Visier (EN 1731) und Kapselgehörschutz: gegen fallende Äste, Späne und den Lärm der Motorsäge (~105 dB(A)).',
    },
    forsthose: {
      slot: 'legs',
      forest: true,
      n: 'Schnittschutzhose',
      d: 'Schnittschutz Klasse 1, Form A: lange Fasern in der Einlage werden vom Kettenrad eingezogen und blockieren die Kette in Sekundenbruchteilen.',
    },
    forststiefel: {
      slot: 'feet',
      forest: true,
      n: 'Schnittschutzstiefel',
      d: 'Mit Schnittschutzeinlage, Stahlkappe und griffiger Profilsohle – Stand am Hang und auf Ästen.',
    },
    forsthand: {
      slot: 'hands',
      forest: true,
      n: 'Forsthandschuhe',
      d: 'Robuste Arbeitshandschuhe, links mit Schnittschutz. An der Motorsäge Pflicht – anders als an Maschinen mit offen drehendem Werkzeug.',
    },
    warnjacke: {
      slot: 'body',
      forest: true,
      n: 'Warnjacke',
      d: 'Signalfarbe: im Bestand sieht man dich von weitem – für die Rufverbindung und bei jeder Fällung.',
    },
  };
  const SLOTS = ['eyes', 'ears', 'resp', 'hands', 'head', 'body', 'legs', 'feet'];
  const S = {
    have: false,
    haveF: false,
    on: { eyes: null, ears: null, resp: null, hands: null, head: null, body: null, legs: null, feet: null },
  };
  try {
    const s = JSON.parse(SAVE.raw(LSK) || 'null');
    if (s) {
      S.have = !!s.have;
      S.haveF = !!s.haveF;
      for (const k of SLOTS) if (s.on && IT[s.on[k]] && IT[s.on[k]].slot === k) S.on[k] = s.on[k];
    }
  } catch (e) {}
  const save = () => {
    try {
      SAVE.setRaw(LSK, JSON.stringify({ have: S.have, haveF: S.haveF, on: S.on }));
    } catch (e) {}
  };
  const worn = id => !!IT[id] && S.on[IT[id].slot] === id;
  // req: list of ids; 'a|b' = one of them
  const missing = req =>
    (req || [])
      .filter(r => !r.split('|').some(worn))
      .map(r =>
        r
          .split('|')
          .map(id => IT[id].n)
          .join(' oder ')
      );
  function wear(id, v) {
    const it = IT[id];
    if (!it) return;
    if (v === undefined) v = !worn(id);
    if (v) S.on[it.slot] = id;
    else if (worn(id)) S.on[it.slot] = null;
    SFX.cloth();
    changed();
  }
  function changed() {
    save();
    try {
      if (window.AVATAR && AVATAR.wear) AVATAR.wear(S.on);
    } catch (e) {}
    try {
      if (audio.muffle) audio.muffle(S.on.ears || S.on.head === 'forsthelm' ? 1 : 0);
    } catch (e) {}
    const fx = $('gearfx');
    if (fx) {
      fx.dataset.eyes = S.on.eyes || '';
      fx.dataset.resp = S.on.resp || '';
      fx.dataset.head = S.on.head || '';
    }
    renderBtn();
    renderWin();
    if (window.WUI) LATE.WUI.refresh();
    markDirty();
  }
  const ICO = {
    eyes: '<svg viewBox="0 0 24 24"><path d="M3 10.5h18M4 10.5c0 3.4 1.6 5 4 5s3.2-1.8 4-3.4c.8 1.6 1.6 3.4 4 3.4s4-1.6 4-5"/></svg>',
    ears: '<svg viewBox="0 0 24 24"><path d="M5.5 13V11a6.5 6.5 0 0 1 13 0v2"/><rect x="3.5" y="12.5" width="4" height="7" rx="2"/><rect x="16.5" y="12.5" width="4" height="7" rx="2"/></svg>',
    resp: '<svg viewBox="0 0 24 24"><path d="M5 9.5c2.3-1.4 4.6-2 7-2s4.7.6 7 2c-.4 5.2-3.2 8.5-7 8.5S5.4 14.7 5 9.5Z"/><path d="M8.5 12.5h7"/></svg>',
    hands:
      '<svg viewBox="0 0 24 24"><path d="M8 20v-5.5L5.6 11a1.4 1.4 0 0 1 2.3-1.6L9 11V5.2a1.3 1.3 0 0 1 2.6 0V10V4.4a1.3 1.3 0 0 1 2.6 0V10V5.6a1.3 1.3 0 0 1 2.6 0V14c0 3-1.6 6-4.6 6Z"/></svg>',
    head: '<svg viewBox="0 0 24 24"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M2.5 14h19"/><path d="M6 14v4h12v-4"/><path d="M9 14v4M12 14v4M15 14v4"/></svg>',
    body: '<svg viewBox="0 0 24 24"><path d="M8 4l-4 3v13h16V7l-4-3"/><path d="M8 4c1 2 7 2 8 0"/><path d="M4 13h16"/></svg>',
    legs: '<svg viewBox="0 0 24 24"><path d="M7 3h10l1 18h-4l-2-11-2 11H6Z"/><path d="M7.5 9h3M13.5 9h3"/></svg>',
    feet: '<svg viewBox="0 0 24 24"><path d="M8 3h5v10l6 3v4H6l1-7Z"/><path d="M6 18h13"/></svg>',
  };
  const btn = $('gearbtn'),
    win = $('gearwin');
  function renderBtn() {
    if (!btn) return;
    btn.hidden = !S.have && !S.haveF;
    const on = SLOTS.filter(k => S.on[k]);
    btn.querySelector('.gi').innerHTML = on.length
      ? on.map(k => `<i class="g-${k}">${ICO[k]}</i>`).join('')
      : `<i class="g-off">${ICO.eyes}</i>`;
    btn.querySelector('.hbt').textContent = on.length ? 'PSA' : 'PSA ab';
    btn.setAttribute(
      'aria-label',
      'Schutzausrüstung: ' + (on.length ? on.map(k => IT[S.on[k]].n).join(', ') : 'nichts angelegt')
    );
  }
  function renderWin() {
    if (!win || win.hidden) return;
    let h = '<h3>Schutzausrüstung<button type="button" class="x" aria-label="Schließen">×</button></h3>';
    const item = ([id, it]) =>
      `<button type="button" class="gitem${worn(id) ? ' on' : ''}" data-g="${id}" aria-pressed="${worn(id)}"><i>${ICO[it.slot]}</i><span><b>${it.n}</b><small>${it.d}</small></span><em>${worn(id) ? 'angelegt' : 'anlegen'}</em></button>`;
    if (!S.have && !S.haveF)
      h +=
        '<p class="gnote">Deine Schutzausrüstung hängt am PSA-Brett in der Werkstatt (Rückwand, neben dem Holzregal)' +
        (window.FELL && LATE.FELL.on
          ? '; die Forstausrüstung liegt in der Forstkiste am Traktor (Untere Klinge).'
          : '.') +
        '</p>';
    if (S.have) {
      h +=
        '<div class="gl">' +
        Object.entries(IT)
          .filter(([, it]) => !it.forest)
          .map(item)
          .join('') +
        '</div>';
      h +=
        '<p class="gnote">Säge und Hobel: Schutzbrille und Gehörschutz, keine Handschuhe. Schleifen: dazu die FFP2-Maske. Räuchern: Korbbrille, ABEK-Halbmaske, Nitrilhandschuhe.</p>';
    }
    if (S.haveF) {
      h +=
        '<h4 class="gh">Wald (Motorsäge)</h4><div class="gl">' +
        Object.entries(IT)
          .filter(([, it]) => it.forest)
          .map(item)
          .join('') +
        '</div>';
      h +=
        '<p class="gnote">Motorsäge: alles fünf – Helm mit Visier und Gehörschutz, Schnittschutzhose, Schnittschutzstiefel, Handschuhe, Warnjacke (DGUV Information 214-046).</p>';
    }
    win.innerHTML = h;
    win.querySelector('.x').addEventListener('click', () => setWin(false));
    win.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => wear(b.dataset.g)));
  }
  function setWin(v) {
    if (!win) return;
    win.hidden = !v;
    if (v) {
      if (window.HUD) HUD.unlock();
      renderWin();
    }
  }
  btn?.addEventListener('click', () => {
    setWin(win.hidden);
    btn.blur();
  });
  whenLoaded(() => setTimeout(changed, 1200));
  renderBtn();
  return {
    IT,
    worn,
    missing,
    wear,
    get have() {
      return S.have;
    },
    get haveForest() {
      return S.haveF;
    },
    give() {
      if (!S.have) {
        S.have = true;
        changed();
      }
    },
    giveForest() {
      if (!S.haveF) {
        S.haveF = true;
        changed();
      }
    },
    on: S.on,
    setWin,
    get winOpen() {
      return !!(win && !win.hidden);
    },
    reset() {
      S.have = false;
      S.haveF = false;
      for (const k of SLOTS) S.on[k] = null;
      changed();
      setWin(false);
    },
    // a check before work: false (and a thought) when something is missing; gloves are refused at machines with rotating tools
    check(req, noGloves, what) {
      if (noGloves && S.on.hands) {
        PLAY.think(
          'Handschuhe aus! An der ' + (what || 'Maschine') + ' können sie vom Werkzeug eingezogen werden.',
          4200
        );
        return false;
      }
      const m = missing(req);
      if (!m.length) return true;
      const forest = (req || []).some(r => r.split('|').some(id => IT[id] && IT[id].forest)),
        got = forest ? S.haveF : S.have;
      PLAY.think(
        (got
          ? 'Erst '
          : forest
            ? 'Erst die Forstausrüstung aus der Forstkiste am Traktor holen: '
            : 'Erst die Schutzausrüstung vom PSA-Brett holen: ') +
          m.join(', ') +
          (got ? ' anlegen (PSA oben rechts).' : '.'),
        4600
      );
      return false;
    },
  };
})();
LATE.GEAR = GEAR;
window.GEAR = GEAR;
