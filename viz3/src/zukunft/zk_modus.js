// ===================== feat/zukunft 3: „Zukünfte erproben“ – the mode, its panel, the year slider, A and B side by side (ZUKUNFT) =====================
// Falko, 12.11.2026: a mode in which a moderator and a village group explore futures of Ratscher in the digital twin, compare variants and see them
// in the world. Menu → Erleben → Szenen → „Zukünfte erproben“ (?szenario=zukunft) and a button in the strategy mode's bar; it works in the plan
// view and on foot. Four topics (Mobilität, Energie, Klimaanpassung, Wald nach dem Käfer), each with „Heute“ and variants; a year slider
// (2026 → 2060); the panel shows Heute, A and B in three columns with five indicators (Kosten, CO₂, Lärm, Naturwert, Stimmung), each with a
// „Warum?“ (calculation and source, or „Annahme“); one key (Y) or button switches the world between A and B at once (the world is one: the
// variants are set in it and taken out again – leaving restores „Heute“). „Präsentation“: large type, clean screen, for a projector.
// The numbers are in zukunft/zk_data.js (pure), the changes in the world in zukunft/zk_welt.js. Saved: pav-zukunft-v1.
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { ZKDATA } from './zk_data.js';
import { ZKWELT } from './zk_welt.js';

export const ZUKUNFT = (() => {
  const Z = ZKDATA;
  const KS = SAVE.key('pav-zukunft-v1', {
    owner: 'zukunft',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (!!v &&
        typeof v === 'object' &&
        v.v === 1 &&
        typeof v.topic === 'string' &&
        Number.isInteger(v.yi) &&
        v.yi >= 0 &&
        v.yi < 5 &&
        !!v.a &&
        typeof v.a === 'object' &&
        !!v.b &&
        typeof v.b === 'object'),
  });
  const S = {
    on: false,
    topic: 'mobil',
    yi: 0,
    a: {},
    b: {},
    show: 'a',
    pres: false,
    collapsed: false,
    why: null,
    ctx: null,
    used: false,
  };
  const esc = s =>
    String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let el = null,
    applyT = 0;
  // ---------- state ----------
  const topicOf = () => Z.topic(S.topic);
  const vid = col => (col === 'h' ? 'heute' : col === 'a' ? S.a[S.topic] : S.b[S.topic]);
  function defaults() {
    for (const t of Z.TOPICS) {
      const v = t.variants.filter(x => x.id !== 'heute');
      if (!Z.variant(t.id, S.a[t.id]) || S.a[t.id] === 'heute') S.a[t.id] = v[0].id;
      if (!Z.variant(t.id, S.b[t.id]) || S.b[t.id] === 'heute') S.b[t.id] = (v[1] || v[0]).id;
    }
  }
  function load() {
    const v = SAVE.get(KS);
    if (v) {
      if (Z.topic(v.topic)) S.topic = v.topic;
      S.yi = v.yi;
      Object.assign(S.a, v.a);
      Object.assign(S.b, v.b);
      S.show = v.show === 'b' || v.show === 'heute' ? v.show : 'a';
      S.pres = !!v.pres;
    }
    defaults();
    return !!(v && v.on);
  }
  function save() {
    SAVE.set(KS, { v: 1, on: S.on, topic: S.topic, yi: S.yi, a: S.a, b: S.b, show: S.show, pres: S.pres });
  }
  const year = () => Z.YEARS[S.yi];
  const calc = col => Z.calc(S.topic, vid(col), year(), S.ctx);
  // ---------- the world follows ----------
  function applyWorld(now) {
    clearTimeout(applyT);
    const go = () => {
      if (!S.on) return;
      const r = Z.calc(S.topic, S.show === 'heute' ? 'heute' : vid(S.show), year(), S.ctx);
      try {
        ZKWELT.apply(r.world, year());
      } catch (e) {
        console.warn('zukunft world', e);
      }
      learn(r.variant);
    };
    if (now) go();
    else applyT = setTimeout(go, 90);
  }
  // ---------- the discovery book ----------
  const BOOK = [
    [
      'zk:bank',
      'politik',
      '🪑',
      'Mitfahrbank',
      'mobil',
      'bank',
      'Eine Bank am Straßenrand mit einem Schild: wer sich setzt, möchte mitgenommen werden. Sie kostet wenig, braucht aber Vertrauen – und eine Klärung, wer bei einem Unfall haftet. Viele Dörfer haben eine.',
      'Im Spiel steht sie am Anger; im Ortsteilrat wird sie beschlossen, das Geld kommt aus dem Ortsteilbudget.',
      [Z.SRC.bank],
    ],
    [
      'zk:rufbus',
      'politik',
      '🚐',
      'Rufbus – der Bus auf Bestellung',
      'mobil',
      'ruf',
      'Ein Rufbus fährt nur, wenn jemand ihn bestellt, per Anruf oder App, und holt Fahrgäste an einer Haltestelle ab. In Thüringen gibt es nur wenige reine Rufbuslinien (Jena seit 1999, Dorfbusse im Wartburgkreis 2021–2023). Eine Fahrt kostet brutto oft 20 bis 45 Euro – den größten Teil zahlt der Landkreis, der den Busverkehr bestellt (§ 3 ThürÖPNVG).',
      'In Ratscher fährt der Linienbus 203/205 nach Schleusingen etwa im Zweistundentakt.',
      [Z.SRC.rufbus, Z.SRC.ruf2],
    ],
    [
      'zk:busleer',
      'natur',
      '🚌',
      'Wann ein Bus dem Klima nützt',
      'mobil',
      'takt',
      'Ein Linienbus stößt etwa 0,85 kg CO₂ je Kilometer aus, ein Auto etwa 0,15. Erst wenn im Mittel mehr als fünf Fahrgäste im Bus sitzen oder er elektrisch fährt, ist er besser als die Autos, die er ersetzt.',
      'Sechs Fahrten mehr nach Schleusingen helfen Menschen ohne Auto, aber dem Klima erst mit voller Besetzung oder Elektroantrieb.',
      [Z.SRC.uba],
    ],
    [
      'zk:pv_ertrag',
      'handwerk',
      '🔆',
      'Dach-Photovoltaik im Dorf',
      'energie',
      'dach',
      'Auf einem Süddach bringt ein Kilowatt Modulleistung bei Ratscher rund 1000 kWh im Jahr; Ost- und Westdächer etwa 85 %. Entscheidend ist, wie viel man selbst verbraucht: Eigenstrom spart etwa 32 Cent je kWh, Einspeisung bringt etwa 8 Cent.',
      'Die geeigneten Dachflächen im Modell sind aus den 3D-Dächern gezählt: Neigung, Ausrichtung, Größe, Randabstand.',
      [Z.SRC.pvgis, Z.SRC.ise, Z.SRC.mastr],
    ],
    [
      'zk:freiflaeche',
      'handwerk',
      '🌾',
      'Freiflächen-Solarpark',
      'energie',
      'park',
      'Etwa ein Hektar Fläche trägt ein Megawatt Modulleistung. Das ist der billigste Solarstrom (unter 5 Cent je kWh), braucht aber einen Bebauungsplan und Fläche, die oft Acker ist. Die Gemeinde darf mit 0,2 Cent je kWh beteiligt werden (§ 6 EEG).',
      'Der Platz im Modell südlich des Dorfs ist eine Annahme zum Ausprobieren, keine Planung.',
      [Z.SRC.eeg6, Z.SRC.ise, Z.SRC.bfn],
    ],
    [
      'zk:waermepumpe',
      'handwerk',
      '♨️',
      'Wärmepumpe im Altbau',
      'energie',
      'waerme',
      'Eine Wärmepumpe macht aus einer Kilowattstunde Strom drei bis vier Kilowattstunden Wärme (Jahresarbeitszahl). Im Altbau braucht sie Dämmung oder große Heizkörper. Die Außeneinheit darf nachts am Nachbarhaus nicht lauter als 40 bis 45 dB(A) sein (TA Lärm).',
      'Im Dorf: je älter das Haus und je enger die Nachbarn, desto genauer muss man hinschauen.',
      [Z.SRC.bafa, Z.SRC.lärm],
    ],
    [
      'zk:starkregen',
      'natur',
      '🌧',
      'Starkregen und Rückhalt',
      'klima',
      'regen',
      'Ein Starkregen bringt in einer Stunde 40 bis 60 Liter je Quadratmeter. Was im Boden nicht versickert, läuft über Straßen und Hänge ins Dorf. Rückhaltemulden, ein größerer Durchlass und Schutz an den Häusern halten das Wasser zurück. Mit der Erwärmung werden solche Regen häufiger.',
      'Der Regen des Szenarios ist ein 100-jähriger (KOSTRA-DWD-2020), die Schadenszahlen Annahmen.',
      [Z.SRC.kostra, Z.SRC.klimaatlas],
    ],
    [
      'zk:hq100',
      'natur',
      '🌊',
      'HQ100 – das Hochwasser von einmal in 100 Jahren',
      'klima',
      'hoch',
      'HQ100 ist die Abflussmenge, die statistisch einmal in 100 Jahren erreicht oder überschritten wird – das heißt nicht, dass es nur alle 100 Jahre geschieht: In 30 Jahren trifft es mit etwa 26 % Wahrscheinlichkeit mindestens einmal ein. Die Hochwassergefahrenkarten des Landes zeigen, welche Häuser betroffen wären.',
      'Im Modell steigt die Schleuse über die Ufer, die Fläche folgt dem Gelände; der Pegel ist eine Annahme, die Karte des Landes war nicht abrufbar.',
      [Z.SRC.hnz],
    ],
    [
      'zk:duerre',
      'natur',
      '☀️',
      'Dürresommer',
      'klima',
      'duerre',
      'In Südthüringen werden trockene Sommer häufiger. Der Boden trocknet aus, Gras wird gelb, Bäche fallen trocken, Fichten kommen in Stress und der Borkenkäfer hat leichtes Spiel.',
      'Im Modell färben sich Boden und Gras, ein Teil der Fichten gelbt.',
      [Z.SRC.klimaatlas],
    ],
    [
      'zk:waldumbau',
      'natur',
      '🌳',
      'Waldumbau nach dem Käfer',
      'wald',
      'umbau',
      'Wo die Fichte stirbt, wird oft ein Mischwald gepflanzt – Buche, Weißtanne, Eiche, Douglasie –, der mit Hitze und Trockenheit besser zurechtkommt. Das kostet etwa 6 000 bis 13 000 Euro je Hektar (mit Zaun und Pflege), die Förderung des Landes kann viel davon tragen.',
      'An der Klinge sterben die Fichten in dem Szenario bis 2045 fast ganz.',
      [Z.SRC.forst],
    ],
    [
      'zk:verjuengung',
      'natur',
      '🌱',
      'Natürliche Verjüngung',
      'wald',
      'natur',
      'Auf Kahlflächen kommen von allein Birke, Eberesche, Aspe und Fichtenjungwuchs. Das kostet fast nichts und bringt viel Naturwert, liefert aber kaum Holz und braucht Samenbäume in der Nähe. Nach 20 Jahren stehen dort zehn bis vierzehn Meter hohe Pionierbäume.',
      'Im Modell wachsen auf knapp der Hälfte der geräumten Plätze junge Bäume nach.',
      [Z.SRC.waldwissen, Z.SRC.forst],
    ],
  ];
  function book() {
    const W = window.WISSEN;
    if (!W || typeof W.add !== 'function' || book.done) return;
    book.done = true;
    for (const [id, ch, icon, title, , , text, here, src] of BOOK)
      W.add({
        id,
        ch,
        icon,
        title,
        text,
        here,
        src: src.map(s => [s[0], s[1]]),
        hint: 'Im Modus „Zukünfte erproben“ die Variante ansehen.',
      });
  }
  function learn(v) {
    const W = window.WISSEN;
    if (!W || !W.found) return;
    book();
    for (const b of BOOK) if (b[4] === S.topic && b[5] === v) W.found(b[0], 'tun:eine Zukunft von Ratscher erprobt');
  }
  // ---------- views ----------
  const FOCUS = {
    mobil: { top: [245, -105, 260], walk: [236, -96, 100], label: 'Haltestelle am Anger' },
    energie: { top: [230, -330, 520], walk: [250, -230, 0], label: 'Dorfrand' },
    klima: { top: [250, 40, 640], walk: [228, 6, 110], label: 'Schleusebrücke' },
    wald: { top: [-280, -670, 820], walk: [-120, -440, 200], label: 'Waldrand an der Klinge' },
  };
  function view(kind) {
    const G = window.GAME,
      f = FOCUS[S.topic];
    if (!G || !f) return;
    if (kind === 'top') {
      G.go('draufsicht');
      G.P.tx = f.top[0];
      G.P.ty = f.top[1];
      G.P.th = f.top[2];
    } else {
      const [x, y, yaw] = f.walk;
      KERN.spot('zukunft-' + S.topic, {
        mode: 'walk',
        pos: [x, y],
        z: KERN.ground(x, y) || 0,
        yaw,
        pitch: 2,
        label: f.label,
      });
      G.go('zukunft-' + S.topic);
    }
    window.markDirty && window.markDirty(true);
  }
  // ---------- the panel ----------
  const CSS = `
#zk{position:fixed;right:12px;top:12px;bottom:12px;width:min(470px,calc(100vw - 24px));z-index:60;display:flex;flex-direction:column;color:#f3efe6;background:rgba(24,28,24,.93);border:1px solid rgba(255,255,255,.14);border-radius:14px;font:14px/1.35 var(--f-body,system-ui,sans-serif);box-shadow:0 8px 30px rgba(0,0,0,.4);overflow:hidden}
#zk[hidden]{display:none}
#zk .zh{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.12)}
#zk .zh b{flex:1;font-size:1.1em}
#zk button{font:inherit;color:inherit;cursor:pointer}
#zk .zb{background:rgba(255,255,255,.12);border:0;border-radius:999px;padding:5px 10px;font-size:.85em}
#zk .zb:hover{background:rgba(255,255,255,.22)}
#zk .zb[aria-pressed="true"]{background:#e8c26a;color:#2a2412}
#zk .zbody{overflow:auto;padding:10px 12px 14px;flex:1;-webkit-overflow-scrolling:touch}
#zk .zt{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
#zk .zt button{flex:1 1 auto;background:rgba(255,255,255,.08);border:1px solid transparent;border-radius:10px;padding:7px 6px;font-size:.9em}
#zk .zt button[aria-pressed="true"]{background:#9fc46a;color:#1d2612;font-weight:700}
#zk .zx{opacity:.85;font-size:.92em;margin:2px 0 8px}
#zk .zy{display:flex;align-items:center;gap:10px;margin:6px 0}
#zk .zy output{font-size:1.9em;font-weight:700;min-width:2.6em;color:#e8c26a}
#zk .zy input{flex:1;accent-color:#e8c26a;min-width:0}
#zk .zyl{display:flex;justify-content:space-between;font-size:.75em;opacity:.7;margin:-2px 2px 6px 0;padding-left:3.6em}
#zk .zs{display:flex;gap:6px;margin:8px 0}
#zk .zs label{flex:1;display:flex;flex-direction:column;font-size:.78em;opacity:.95;gap:2px;min-width:0}
#zk select{font:inherit;color:#f3efe6;background:#2c332c;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px;min-width:0;width:100%}
#zk .zw{display:flex;align-items:center;gap:6px;margin:6px 0 10px;flex-wrap:wrap}
#zk .zw span{font-size:.85em;opacity:.85}
#zk table{width:100%;border-collapse:collapse;table-layout:fixed}
#zk th{font-size:.8em;text-align:left;padding:3px 5px;opacity:.9}
#zk th.zon,#zk td.zon{background:rgba(232,194,106,.13)}
#zk td{vertical-align:top;padding:6px 5px;border-top:1px solid rgba(255,255,255,.1);word-wrap:break-word}
#zk td.zr{width:19%;font-weight:600;font-size:.88em}
#zk td b{display:block;font-size:.95em}
#zk td small{display:block;opacity:.78;font-size:.78em;margin-top:2px}
#zk td .zq{background:rgba(255,255,255,.14);border:0;border-radius:50%;width:20px;height:20px;line-height:20px;padding:0;font-size:.75em;margin-top:3px}
#zk .zd{margin:10px 0;padding:10px;border-radius:10px;background:rgba(255,255,255,.08);font-size:.92em}
#zk .zd h4{margin:0 0 4px;font-size:1em}
#zk .zd .tag{display:inline-block;font-size:.75em;border-radius:999px;padding:1px 8px;margin-right:6px;background:#c98a3b;color:#241a08}
#zk .zd .tag.q{background:#9fc46a;color:#1d2612}
#zk .zd a{color:#9ccfe8}
#zk .zv h4{margin:12px 0 4px;font-size:.95em}
#zk .zv p{margin:3px 0;font-size:.88em}
#zk .zv i{opacity:.75}
#zk .zn{font-size:.75em;opacity:.65;margin-top:12px}
#zk.col .zbody{display:none}
body.zk-pres #zk{width:min(60vw,820px);font-size:19px}
body.zk-pres #hotbar,body.zk-pres #moves,body.zk-pres #act2,body.zk-pres #actrow,body.zk-pres #joy,body.zk-pres #hudtr,body.zk-pres #hint,body.zk-pres #hbname,body.zk-pres #geoattr,body.zk-pres #camtog,body.zk-pres #orbithud,body.zk-pres #menubtn{display:none!important}
@media (max-width:700px){#zk{left:6px;right:6px;top:auto;bottom:6px;width:auto;max-height:58vh;font-size:13px}#zk td{padding:5px 3px}body.zk-pres #zk{width:auto;font-size:15px}}
`;
  function build() {
    if (el) return el;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    el = document.createElement('div');
    el.id = 'zk';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Zukünfte erproben');
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
    el.addEventListener('input', onInput);
    el.addEventListener('change', onInput);
    return el;
  }
  const colName = c => (c === 'h' ? 'Heute' : c === 'a' ? 'A' : 'B');
  function cellHTML(col, ind, r) {
    const x = r.ind[ind];
    const on = S.show === 'a' ? 'a' : S.show === 'b' ? 'b' : 'h';
    return `<td class="${on === col ? 'zon' : ''}"><b>${esc(x.main)}</b><small>${esc(x.sub)}</small>${x.range ? `<small>Spanne ${esc(x.range)}</small>` : ''}<button type="button" class="zq" data-why="${col}:${ind}" title="Warum?" aria-label="Warum? ${esc(x.label)} ${colName(col)}">?</button></td>`;
  }
  function render() {
    if (!el) return;
    const T = topicOf(),
      R = { h: calc('h'), a: calc('a'), b: calc('b') };
    const opts = cur =>
      T.variants
        .filter(v => v.id !== 'heute')
        .map(v => `<option value="${v.id}"${v.id === cur ? ' selected' : ''}>${esc(v.label)}</option>`)
        .join('');
    const rows = Z.ORDER.map(
      ind =>
        `<tr><td class="zr">${esc(R.a.ind[ind].label)}</td>${['h', 'a', 'b'].map(c => cellHTML(c, ind, R[c])).join('')}</tr>`
    ).join('');
    let why = '';
    if (S.why) {
      const [c, ind] = S.why.split(':'),
        x = R[c] && R[c].ind[ind];
      if (x) {
        const w = x.why;
        why = `<div class="zd" id="zkwhy"><h4>Warum? ${esc(x.label)} · ${esc(colName(c))}${c === 'h' ? '' : ' (' + esc(Z.variant(S.topic, vid(c)).label) + ')'} · ${year()}</h4><span class="tag ${w.annahme ? '' : 'q'}">${w.annahme ? 'Annahme' : 'Quelle'}</span>${esc(w.text)}${w.src.length ? '<div>Quellen: ' + w.src.map(s => (s[1] ? `<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>` : esc(s[0]))).join(' · ') + '</div>' : ''}</div>`;
      }
    }
    const voices = ['a', 'b']
      .map(c => {
        const v = R[c].ind.stimmung.voices || [];
        return v.length
          ? `<h4>Stimmen zu ${colName(c)}: ${esc(Z.variant(S.topic, vid(c)).short)}</h4>` +
              v
                .map(
                  x =>
                    `<p><b>${esc(x.name)}</b> <i>(${esc(x.role)}, ${x.lean > 0 ? 'dafür' : x.lean < 0 ? 'dagegen' : 'unentschieden'})</i> – „${esc(x.say)}“</p>`
                )
                .join('')
          : '';
      })
      .join('');
    el.className = S.collapsed ? 'col' : '';
    el.innerHTML = `<div class="zh"><b>Zukünfte erproben</b><button type="button" class="zb" data-a="pres" aria-pressed="${S.pres}" title="Große Schrift, freier Bildschirm für den Beamer">Präsentation</button><button type="button" class="zb" data-a="col" title="Fenster ein- oder ausklappen">${S.collapsed ? '▴' : '▾'}</button><button type="button" class="zb" data-a="exit" title="Zurück zu „Heute“">✕ Beenden</button></div>
<div class="zbody"><div class="zt" role="tablist">${Z.TOPICS.map(t => `<button type="button" role="tab" data-topic="${t.id}" aria-pressed="${t.id === S.topic}">${t.icon} ${esc(t.label)}</button>`).join('')}</div>
<div class="zx">${esc(T.text)}</div>
<div class="zy"><output id="zkyear">${year()}</output><input type="range" id="zkyi" min="0" max="4" step="1" value="${S.yi}" aria-label="Jahr"></div>
<div class="zyl">${Z.YEARS.map(y => `<span>${y}</span>`).join('')}</div>
<div class="zs"><label>Variante A<select data-sel="a">${opts(S.a[S.topic])}</select></label><label>Variante B<select data-sel="b">${opts(S.b[S.topic])}</select></label></div>
<div class="zw"><span>Die Welt zeigt:</span><button type="button" class="zb" data-show="heute" aria-pressed="${S.show === 'heute'}">Heute</button><button type="button" class="zb" data-show="a" aria-pressed="${S.show === 'a'}">A</button><button type="button" class="zb" data-show="b" aria-pressed="${S.show === 'b'}">B</button><span>(Taste Y wechselt A/B)</span></div>
<div class="zw"><button type="button" class="zb" data-view="top">Von oben ansehen</button><button type="button" class="zb" data-view="walk">Hingehen: ${esc(FOCUS[S.topic].label)}</button></div>
<table><thead><tr><th></th><th class="${S.show === 'heute' ? 'zon' : ''}">Heute</th><th class="${S.show === 'a' ? 'zon' : ''}">A · ${esc(Z.variant(S.topic, S.a[S.topic]).short)}</th><th class="${S.show === 'b' ? 'zon' : ''}">B · ${esc(Z.variant(S.topic, S.b[S.topic]).short)}</th></tr></thead><tbody>${rows}</tbody></table>
${why}<div class="zv">${voices}</div>
<div class="zn">Preise in Euro von 2026. Jede Zahl hat ein „?“ mit Rechnung und Quelle; was nicht belegt ist, heißt „Annahme“. Die Stimmen sind Figuren des Spiels, keine Umfrage in Ratscher. Fahrplan: ${S.ctx && S.ctx.bus && S.ctx.bus.src === 'fahrplan' ? 'echt (gtfs.de) – ' + S.ctx.bus.werk + ' Fahrten werktags nach Schleusingen, etwa ' + S.ctx.bus.min + ' min' : 'Annahme'}. Dachflächen: ${S.ctx && S.ctx.roof && S.ctx.roof.src === 'welt' ? 'aus den 3D-Dächern gezählt' : 'Annahme'}.</div></div>`;
  }
  // ---------- events ----------
  function onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    e.stopPropagation();
    if (b.dataset.topic) setTopic(b.dataset.topic);
    else if (b.dataset.show) show(b.dataset.show);
    else if (b.dataset.view) view(b.dataset.view);
    else if (b.dataset.why) {
      S.why = S.why === b.dataset.why ? null : b.dataset.why;
      render();
      if (S.why) el.querySelector('#zkwhy')?.scrollIntoView({ block: 'nearest' });
    } else if (b.dataset.a === 'exit') exit();
    else if (b.dataset.a === 'pres') pres(!S.pres);
    else if (b.dataset.a === 'col') {
      S.collapsed = !S.collapsed;
      render();
    }
  }
  function onInput(e) {
    const t = e.target;
    if (t.id === 'zkyi') {
      setYear(+t.value, true);
    } else if (t.dataset && t.dataset.sel) {
      S[t.dataset.sel][S.topic] = t.value;
      S.why = null;
      render();
      applyWorld();
      save();
    }
  }
  function setTopic(id) {
    if (!Z.topic(id) || id === S.topic) return;
    S.topic = id;
    S.why = null;
    S.show = 'a';
    render();
    applyWorld(true);
    save();
  }
  function setYear(i, quiet) {
    S.yi = Math.max(0, Math.min(4, i | 0));
    S.why = null;
    if (quiet && el) {
      const o = el.querySelector('#zkyear');
      if (o) o.textContent = year();
      // only the numbers change; the slider keeps the finger
      const keep = el.querySelector('.zbody').scrollTop;
      clearTimeout(setYear.t);
      setYear.t = setTimeout(() => {
        render();
        const bd = el.querySelector('.zbody');
        if (bd) bd.scrollTop = keep;
      }, 120);
    } else render();
    applyWorld();
    save();
  }
  function show(w) {
    if (w !== 'a' && w !== 'b' && w !== 'heute') return;
    S.show = w;
    render();
    applyWorld(true);
    save();
  }
  const toggle = () => show(S.show === 'a' ? 'b' : 'a');
  function pres(on) {
    S.pres = !!on;
    document.body.classList.toggle('zk-pres', S.pres && S.on);
    render();
    save();
  }
  // ---------- start and end ----------
  let offBus = null;
  function enter() {
    if (S.on) return;
    defaults();
    build();
    ZKWELT.warm();
    S.on = true;
    S.used = true;
    try {
      S.ctx = ZKWELT.ctx();
    } catch (e) {
      console.warn('zukunft ctx', e);
      S.ctx = null;
    }
    el.hidden = false;
    document.body.classList.toggle('zk-pres', S.pres);
    if (!offBus)
      offBus = KERN.on('bus:bereit', () => {
        if (!S.on) return;
        try {
          S.ctx = ZKWELT.ctx();
        } catch (e) {}
        render();
      });
    render();
    applyWorld(true);
    save();
    KERN.emit('zukunft:modus', { on: true });
  }
  function exit() {
    if (!S.on) return;
    S.on = false;
    clearTimeout(applyT);
    ZKWELT.clear();
    if (el) el.hidden = true;
    document.body.classList.remove('zk-pres');
    save();
    KERN.emit('zukunft:modus', { on: false });
  }
  KERN.scenario('zukunft', { label: 'Zukünfte erproben', order: 5, run: enter });
  window.addEventListener('keydown', e => {
    if (!S.on || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      toggle();
    }
  });
  // a button in the strategy mode's bar
  function stratBtn() {
    const ST = window.STRAT;
    if (!ST || !ST.on || typeof document === 'undefined') return;
    const w = document.querySelector('.stb[data-a="wissen"]') || document.querySelector('.stb[data-a="layers"]');
    if (!w || (w.parentNode && w.parentNode.querySelector('[data-zukunft-st]'))) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stb';
    b.dataset.zukunftSt = '1';
    b.title = 'Zukünfte erproben: Mobilität, Energie, Klimaanpassung, Wald – Varianten A und B';
    b.textContent = '🔮 Zukunft';
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      S.on ? exit() : enter();
    });
    w.after(b);
  }
  KERN.on('strategie:modus', () => setTimeout(stratBtn, 60));
  // saved state in: the mode goes on after a reload
  load();
  if (SAVE.get(KS) && SAVE.get(KS).on && !/szenario=/.test(location.search))
    KERN.until(() => window.GAME && GAME.loaded && GAME.loaded(), 3600).then(
      () => setTimeout(enter, 2500),
      () => {}
    );
  const API = {
    S,
    enter,
    exit,
    setTopic,
    setYear,
    show,
    toggle,
    pres,
    view,
    calc,
    render,
    state: () => ({
      on: S.on,
      topic: S.topic,
      year: year(),
      a: S.a[S.topic],
      b: S.b[S.topic],
      show: S.show,
      pres: S.pres,
    }),
    set: (col, id) => {
      S[col][S.topic] = id;
      render();
      applyWorld(true);
      save();
    },
  };
  return API;
})();
window.ZUKUNFT = ZUKUNFT;
