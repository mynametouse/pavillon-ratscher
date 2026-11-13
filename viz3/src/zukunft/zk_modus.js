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
    yi: 1,
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
      S.yi = Math.max(1, v.yi | 0);
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
      'Eine Bank am Straßenrand mit einem Schild: wer sich setzt, möchte mitgenommen werden. Sie kostet etwa 3 000 Euro mit Schild und braucht Vertrauen; das Ortsteilbudget reicht dafür nicht, die Stadt oder Spenden müssten helfen. Bei einem Unfall greift die Kfz-Haftpflicht des Fahrzeugs, das mitnimmt – sie deckt auch die Mitfahrenden. Viele Dörfer haben eine.',
      'Im Spiel steht sie im Ort; im Ortsteilrat würde sie beschlossen, bezahlt würde sie aber von der Stadt oder aus Spenden.',
      [Z.SRC.bank, Z.SRC.mfbank, Z.SRC.mfbank2],
    ],
    [
      'zk:rufbus',
      'politik',
      '🚐',
      'Rufbus – der Bus auf Bestellung',
      'mobil',
      'ruf',
      'Ein Rufbus fährt nur, wenn jemand ihn bestellt, per Anruf oder App, und holt Fahrgäste an einer Haltestelle ab. In Thüringen gibt es nur wenige reine Rufbuslinien (Jena seit 1999); die beiden Dorfbus-Versuche im Wartburgkreis wurden wieder in normale Linien überführt. Nach einem MDR-Bericht von 2023 (zitiert in Drs. 7/8819) sollten im Landkreis Hildburghausen einige Linien nur noch als Rufbus fahren – beim Landkreis nachfragen. Eine Fahrt kostet je Fahrgast oft 30 bis 56 Euro (eigene Rechnung aus Zahlen der Landkreise in Mecklenburg-Vorpommern 2023–2025) – den größten Teil zahlt der Landkreis, der den Busverkehr bestellt (§ 3 ThürÖPNVG).',
      'In Ratscher fahren die Linien 203 und 205 nach Schleusingen: montags bis freitags etwa 30 Fahrten am Tag (von 5:11 bis 22:57 Uhr), samstags 14, sonntags 11. Der Rufbus füllt die Lücken, etwa nach dem letzten Bus um 21:10 aus Schleusingen.',
      [Z.SRC.rufbus, Z.SRC.mvruf, Z.SRC.ruf2],
    ],
    [
      'zk:busleer',
      'natur',
      '🚌',
      'Wann ein Bus dem Klima nützt',
      'mobil',
      'takt',
      'Ein Linienbus stößt etwa 1 kg CO₂ je Kilometer aus (mit Vorkette), ein Auto etwa 0,23. Erst wenn im Mittel vier bis fünf Fahrgäste im Bus sitzen, die sonst allein Auto gefahren wären, oder wenn er elektrisch fährt, ist er besser als die Autos, die er ersetzt.',
      'Sechs Fahrten mehr am Abend und am Wochenende helfen Menschen ohne Auto, aber dem Klima erst mit guter Besetzung oder Elektroantrieb.',
      [Z.SRC.ubaverkehr],
    ],
    [
      'zk:pv_ertrag',
      'handwerk',
      '🔆',
      'Dach-Photovoltaik im Dorf',
      'energie',
      'dach',
      'Auf einem Süddach bringt ein Kilowatt Modulleistung bei Ratscher rund 1000 kWh im Jahr (PVGIS: 1 011 kWh bei 35° nach Süden); Ost- und Westdächer etwa 820 kWh. Entscheidend ist, wie viel man selbst verbraucht: Eigenstrom spart etwa 32 Cent je kWh, Einspeisung bringt 7,7 Cent (seit 1.8.2026; ob es die feste Vergütung nach 2026 noch gibt, ist offen).',
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
      'Knapp ein Hektar Fläche trägt ein Megawatt Modulleistung. Das ist der billigste Solarstrom (4,1 bis 6,9 Cent je kWh nach Fraunhofer ISE), braucht aber einen Bebauungsplan und Fläche, die oft Acker ist. Die Gemeinde kann mit 0,2 Cent je kWh beteiligt werden (§ 6 EEG: ein „soll“, freiwillig).',
      'Der Platz im Modell südlich des Dorfs ist eine Annahme zum Ausprobieren, keine Planung (im Marktstammdatenregister ist hier keine Freiflächenanlage geplant).',
      [Z.SRC.eeg6, Z.SRC.pvstrom, Z.SRC.laenderbet, Z.SRC.bfn],
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
      [Z.SRC.vzwp, Z.SRC.kfw, Z.SRC.lärm],
    ],
    [
      'zk:starkregen',
      'natur',
      '🌧',
      'Starkregen und Rückhalt',
      'klima',
      'regen',
      'Der Deutsche Wetterdienst warnt vor Starkregen ab 15 Litern je Quadratmeter in der Stunde, vor extremem Regen ab 40; für Ratscher gilt als Regen, wie er einmal in 100 Jahren fällt, etwa 47 Liter (KOSTRA-DWD-2020, ± 26 %). Was im Boden nicht versickert, läuft über Straßen und Hänge ins Dorf. Rückhaltemulden, ein größerer Durchlass und Schutz an den Häusern halten das Wasser zurück. Mit der Erwärmung werden solche Regen häufiger.',
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
      'Im Modell ist das amtliche Überschwemmungsgebiet (HQ100) des Landes eingefärbt; wie hoch das Wasser an jedem Gebäude steht, ist nicht amtlich.',
      [Z.SRC.uesg, Z.SRC.hnz],
    ],
    [
      'zk:hq23',
      'natur',
      '🌊',
      'Hochwasser im Dezember 2023 – Rückhalt der Talsperre',
      'klima',
      'dez23',
      'Im Dezember 2023 hielt die Talsperre Ratscher (Betreiber TFW) etwa 900 000 m³ Wasser zurück (Landtag Drs. 7/9624). Ein Rückhaltebecken senkt die Spitze der Welle, aber es füllt sich: Kommt mehr Wasser, als hineinpasst, läuft es über.',
      'Im Modell steht das Wasser niedriger als beim schweren Hochwasser; der Pegel im Dorf und die Schäden sind Annahmen.',
      [Z.SRC.dez23, Z.SRC.hnz],
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
    wald: { top: [-280, -670, 820], walk: [-120, -440, 200], label: 'Untere Klinge (Familienwald)' },
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
          ? `<h4>${R[c].ind.stimmung.event ? 'Was Leute dazu sagen' : 'Stimmen zu'} ${colName(c)}: ${esc(Z.variant(S.topic, vid(c)).short)}</h4>` +
              v
                .map(
                  x =>
                    `<p><b>${esc(x.name)}</b> <i>(${esc(x.role)}${R[c].ind.stimmung.event ? '' : ', ' + (x.lean > 0 ? 'dafür' : x.lean < 0 ? 'dagegen' : 'unentschieden')})</i> – „${esc(x.say)}“</p>`
                )
                .join('')
          : '';
      })
      .join('');
    el.className = S.collapsed ? 'col' : '';
    el.innerHTML = `<div class="zh"><b>Zukünfte erproben</b><button type="button" class="zb" data-a="pres" aria-pressed="${S.pres}" title="Große Schrift, freier Bildschirm für den Beamer">Präsentation</button><button type="button" class="zb" data-a="col" title="Fenster ein- oder ausklappen">${S.collapsed ? '▴' : '▾'}</button><button type="button" class="zb" data-a="exit" title="Zurück zu „Heute“">✕ Beenden</button></div>
<div class="zbody"><div class="zt" role="tablist">${Z.TOPICS.map(t => `<button type="button" role="tab" data-topic="${t.id}" aria-pressed="${t.id === S.topic}">${t.icon} ${esc(t.label)}</button>`).join('')}</div>
<div class="zx">${esc(T.text)}</div>
<div class="zy"><output id="zkyear">${year()}</output><input type="range" id="zkyi" min="1" max="4" step="1" value="${Math.max(1, S.yi)}" aria-label="Jahr"></div>
<div class="zyl">${Z.YEARS.slice(1)
      .map(y => `<span>${y}</span>`)
      .join('')}</div>
<div class="zs"><label>Variante A<select data-sel="a">${opts(S.a[S.topic])}</select></label><label>Variante B<select data-sel="b">${opts(S.b[S.topic])}</select></label></div>
<div class="zw"><span>Die Welt zeigt:</span><button type="button" class="zb" data-show="heute" aria-pressed="${S.show === 'heute'}">Heute</button><button type="button" class="zb" data-show="a" aria-pressed="${S.show === 'a'}">A</button><button type="button" class="zb" data-show="b" aria-pressed="${S.show === 'b'}">B</button><span>(Taste Y wechselt A/B)</span></div>
<div class="zw"><button type="button" class="zb" data-view="top">Von oben ansehen</button><button type="button" class="zb" data-view="walk">Hingehen: ${esc(FOCUS[S.topic].label)}</button></div>
<table><thead><tr><th></th><th class="${S.show === 'heute' ? 'zon' : ''}">Heute</th><th class="${S.show === 'a' ? 'zon' : ''}">A · ${esc(Z.variant(S.topic, S.a[S.topic]).short)}</th><th class="${S.show === 'b' ? 'zon' : ''}">B · ${esc(Z.variant(S.topic, S.b[S.topic]).short)}</th></tr></thead><tbody>${rows}</tbody></table>
${why}<div class="zv">${voices}</div>
<div class="zn">Preise in Euro von 2026. Jede Zahl hat ein „?“ mit Rechnung und Quelle; was nicht belegt ist, heißt „Annahme“. Das Jahr ist das Jahr der Wirkung nach Fertigstellung. Die Stimmen sind erfundene Platzhalter für Ihre eigenen, keine Umfrage in Ratscher. Fahrplan: ${S.ctx && S.ctx.bus && S.ctx.bus.src === 'fahrplan' ? 'echt (gtfs.de) – ' + S.ctx.bus.werk + ' Fahrten werktags nach Schleusingen, etwa ' + S.ctx.bus.min + ' min' : 'Annahme'}${S.ctx && S.ctx.school ? '; Schulbus: ' + S.ctx.school.trips + ' Fahrten an einem Schultag über Ratscher (alle Richtungen)' : ''}. Dachflächen: ${S.ctx && S.ctx.roof && S.ctx.roof.src === 'welt' ? 'aus den 3D-Dächern gezählt' : 'Annahme'}.</div></div>`;
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
    S.yi = Math.max(0, Math.min(4, i | 0)); // the API accepts 2026 (tests), the slider starts at 2030
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
  // school-bus trips of the real timetable on a school-day Wednesday (trips flagged school, Ratscher stops, towards Schleusingen) – read from BUSPLAN here
  function schoolStats() {
    const bp = window.BUS && BUS.plan;
    if (!bp || !bp.S || !bp.S.trips.length) return null;
    const names = new Set(bp.S.stations.filter(x => /^Ratscher\b/.test(x.n) && !/Stausee/.test(x.n)).map(x => x.i));
    const e0 =
      (window.DN && Number.isFinite(DN.e0) ? DN.e0 : 20393) + Math.floor(((window.CLOCK && CLOCK.t) || 0) / 1440);
    let e = e0;
    for (let d = 0; d < 21; d++, e++) {
      if (new Date(e * 864e5).getUTCDay() !== 3) continue;
      const D = bp.day(e);
      if (D.ferien) continue;
      let n = 0;
      for (const t of bp.tripsOn(e)) {
        if (!t.school) continue;
        const P = bp.S.pats[t.pat];
        if (P && P.st.some(o => names.has(o.s))) n++;
      }
      return { trips: n, src: 'fahrplan' };
    }
    return null;
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
      S.ctx.school = schoolStats();
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
          S.ctx.school = schoolStats();
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
    // on a phone the strategy bar has no room for one more button (it would push the time box off the screen): the mode stays
    // reachable there through Menu → Erleben → Szenen
    if (window.innerWidth < 560) return;
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
