// ===================== feat/grenzland-ruf: what the village thinks of the two – the rules and the words, pure (GLRUFDATA) =====================
// Falko, 17.11.2026 12:26 („Das Dorf redet über euch“): people greet, whisper or call the police – after what one did; rumours at the inn
// and in the village chat. Pure (no scene, no DOM – node tests: viz3/test/unit/grenzland_ruf.test.mjs); grenzland/gl_ruf.js applies it.
//   a value per place ('ratscher', 'schleusingen'), −100 … +100: deeds somebody saw take from it (all of it when the village knows who it
//   was, half when it only guesses), the other place hears a third of it; good deeds add (side jobs, help on the road, a festival); every
//   game day it drifts a few points back towards 0 (people forget). Four steps with a margin at each line (no flicker): beliebt ≥ 30,
//   neutral ≥ −20, misstrauisch ≥ −55, verhasst below. The three decisions of chapter 2 may add (grund 'entscheidung:<id>').
//   GEREDE (the village chat, text), FEED (the regional feed), SPRUCH (spoken gossip: fixed fragments one after another – who, where,
//   what – so that each can be recorded), SAGT (what a person says to the player by step). Standard German with the words of the region,
//   dry like the chat; never mean, nobody real (Hubert and Ronald never appear), invented names only.
export const GLRUFDATA = (() => {
  const ORTE = ['ratscher', 'schleusingen'];
  const NAME = { ratscher: 'Ratscher', schleusingen: 'Schleusingen' };
  const MIN = -100,
    MAX = 100;
  // ---- the steps: best first; `ab` the lowest value of the step ----
  const STUFEN = [
    { id: 'beliebt', ab: 30, name: 'beliebt' },
    { id: 'neutral', ab: -20, name: 'neutral' },
    { id: 'misstrauisch', ab: -55, name: 'misstrauisch' },
    { id: 'verhasst', ab: -Infinity, name: 'verhasst' },
  ];
  const HYST = 4; // a step changes only once the value is this far past the line
  const IDX = { beliebt: 0, neutral: 1, misstrauisch: 2, verhasst: 3 };
  const roh = w => {
    for (const s of STUFEN) if (w >= s.ab) return s.id;
    return 'verhasst';
  };
  // the step of a value; with the step it had: changed only past the line by HYST
  function stufe(w, alt) {
    w = Number.isFinite(w) ? w : 0;
    const r = roh(w);
    if (!alt || !(alt in IDX) || r === alt) return r;
    if (IDX[r] < IDX[alt]) {
      const c = roh(w - HYST);
      return IDX[c] < IDX[alt] ? c : alt;
    }
    const c = roh(w + HYST);
    return IDX[c] > IDX[alt] ? c : alt;
  }
  const clamp = w => Math.max(MIN, Math.min(MAX, Number.isFinite(w) ? w : 0));
  // ---- deeds that somebody saw (the ids of GLLOGIK.CRIMES) → what they cost; the group decides the words ----
  const TAT = {
    rempeln: { n: -5, g: 'grob' },
    schlag: { n: -12, g: 'schlag' },
    autoklau: { n: -15, g: 'klau' },
    raserei: { n: -3, g: 'raserei' },
    boeller: { n: -4, g: 'boeller' },
    hausfrieden: { n: -7, g: 'garten' },
    einbruch: { n: -18, g: 'einbruch' },
    flucht: { n: -5, g: 'flucht' },
    sperre: { n: -8, g: 'sperre' },
    widerstand: { n: -10, g: 'widerstand' },
    angeln: { n: -2, g: 'angeln' },
    poebeln: { n: -4, g: 'poebeln' },
    verdacht: { n: 0, g: '' },
    helm: { n: 0, g: '' },
  };
  const KENNT = 1, // the village knows who it was (a witness who knows them, or the police know the name)
    AHNT = 0.5, // a description only: they guess
    NACHBAR = 0.3; // the other place hears of it (two kilometres are nothing for a rumour)
  // what a deed somebody saw costs at the place (0 when nobody saw it): { n, nachbar, g }
  function tat(id, o = {}) {
    const T = TAT[id];
    if (!T || !T.n || !(o.zeugen > 0)) return { n: 0, nachbar: 0, g: T ? T.g : '' };
    const n = Math.round(T.n * (o.bekannt || o.knows ? KENNT : AHNT) * 10) / 10;
    return { n, nachbar: Math.round(n * NACHBAR * 10) / 10, g: T.g };
  }
  // other happenings: an arrest in front of everybody; the four answers of gl_reaktion.js; good deeds (gl_jobs.js, strasse, alltag)
  const ANDERES = {
    erwischt: -6,
    gruessen: 0.5,
    beruhigen: 1,
    sprueche: -1,
    provozieren: -3,
    job: 6,
    hilfe: 4,
    fest: 2,
  };
  // ---- forgetting: points per game day back towards 0 (never past it) ----
  const VERGISST = 6;
  function vergessen(w, tage) {
    if (!(tage > 0) || !w) return w;
    const d = VERGISST * tage;
    return w > 0 ? Math.max(0, w - d) : Math.min(0, w + d);
  }
  // ---- where a deed counts: the town around its market, else the village (the dam, the Klinge, the barn: all Ratscher's) ----
  const MARKT = [-1100.5, 1214.5],
    STADT_R = 750;
  const ortVon = (x, y) => (Math.hypot(x - MARKT[0], y - MARKT[1]) < STADT_R ? 'schleusingen' : 'ratscher');
  // the place as words ('am Anger') from the game's place name (KERN.place) – the first that fits
  const WO = [
    [/linde/i, 'an der Linde'],
    [/Anger|Verkaufswagen|Bushaltestelle|Haltestelle/, 'am Anger'],
    [/Schule/, 'an der alten Schule'],
    [/Feldscheune|Kegel/, 'an der Feldscheune'],
    [/Talsperre|Staudamm|Staumauer|Damm/, 'an der Talsperre'],
    [/Klinge/, 'an der Klinge'],
    [/Garten/, 'beim Garten'],
    [/Markt/, 'auf dem Markt'],
    [/Bertholdsburg/, 'an der Bertholdsburg'],
    [/Schleusingen/, 'in Schleusingen'],
    [/Ratscher|Dorf/, 'im Dorf'],
  ];
  function woVon(place, ort) {
    const p = String(place || '');
    for (const [re, w] of WO) if (re.test(p)) return w;
    return ort === 'schleusingen' ? 'in Schleusingen' : 'im Dorf';
  }
  // who did it, as the village says it: 'm' Falko, 'f' Sarah, '' (nobody knows)
  const WERNAME = { m: 'Falko', f: 'Sarah', '': 'irgendeiner' };
  // nobody knows who it was: what the witnesses saw (the clothes of GLFAHNDUNG.ist(); a balaclava or a helmet first)
  const AUSSEHEN = {
    haube: 'jemand mit Sturmhaube',
    helm: 'jemand mit Helm',
    karo: 'einer im roten Karohemd',
    dunkel: 'eine in dunkler Jacke',
    warn: 'jemand in oranger Warnjacke',
    hell: 'jemand in heller Jacke',
    parka: 'jemand im grünen Parka',
  };
  const aussehen = (ist = {}) => AUSSEHEN[ist.kopf] || AUSSEHEN[ist.kleid] || WERNAME[''];
  // ---- the village chat „Ratscher aktuell“ (text: {name} who, {wo} where); by the deed's group, the good deeds, the steps ----
  const GEREDE = {
    grob: [
      ['Ingrid', 'Habt ihr gehört? {Wo} hat {name} einen umgeschubst. Einfach so. Ich sag ja nichts.'],
      ['Uwe', 'War ich nicht. Diesmal war es {name}.'],
    ],
    schlag: [
      ['Katrin', '{Wo} gab es eine Prügelei. Angeblich {name}. Ich hab extra das Fenster aufgemacht.'],
      ['Manfred', 'Wer sich {wo} prügelt, kann auch beim Schlauchtragen helfen. Nur so ein Gedanke.'],
    ],
    klau: [
      ['Jens', 'Bei uns ist ein Auto weg. Wer es hat: Der Tank war eh fast leer. Gesehen wurde {name}.'],
      ['Ingrid', 'Ein Auto geklaut, {wo}! Ich stell meins jetzt hinters Haus.'],
    ],
    raserei: [
      ['Heike', '{Name} ist {wo} durch, als wäre die Straße eine Rennstrecke. Meine Hühner legen heute nicht mehr.'],
      ['Wolfgang', 'Tempo 30 ist ein Schild. Kein Vorschlag. Das gilt auch für {name}.'],
    ],
    boeller: [
      ['Ingrid', 'Das mit dem Böller {wo} war übrigens {name}. Hat man mir gesagt.'],
      ['Heike', 'Der Hund liegt immer noch unterm Sofa. Gesehen hat man {name}.'],
    ],
    garten: [
      ['Katrin', '{Name} ist {wo} durch fremde Gärten gestiegen. Bei mir steht jetzt eine Gießkanne als Falle.'],
    ],
    einbruch: [
      ['Ingrid', 'EINBRUCH {wo}! Und es soll {name} gewesen sein. Ich schlafe heute mit dem Nudelholz.'],
      ['Manfred', 'Ab heute schließt jeder ab. Auch die Scheune. Auch du, Uwe.'],
      ['Uwe', 'War ich nicht. Ich schließe nie ab.'],
    ],
    flucht: [['Wolfgang', '{Name} ist {wo} vor der Polizei abgehauen. Früher hätte man dafür eine Urkunde bekommen.']],
    sperre: [['Jens', 'Durch die Polizeisperre {wo}! Es war {name}. Die Leitkegel bezahlt die Gemeinde.']],
    widerstand: [['Katrin', '{Name} hat sich {wo} mit der Polizei angelegt. Mutig oder dumm, wir stimmen noch ab.']],
    angeln: [['Wolfgang', 'Ohne Karte geangelt, {wo}: {name}. Gemeldet hat es der Karpfen, nicht ich.']],
    poebeln: [['Heike', '{Name} hat {wo} Leute angepöbelt. Bei mir gibt es trotzdem Kürbissuppe. Für alle.']],
    erwischt: [
      ['Ingrid', 'Abgeführt wurde {name}, {wo}. Hände aufs Dach, das ganze Programm. Ich war zufällig am Fenster.'],
      ['Uwe', 'Ich auch. Zufällig.'],
    ],
    // good deeds
    broetchen: [
      ['Heike', 'Die Brötchen hingen heute pünktlich an der Tür. Danke an {name}!'],
      ['Ingrid', 'So frisch kamen die Brötchen lange nicht. Und keins zerdrückt. Vorbildlich.'],
    ],
    broetchen_platt: [['Wolfgang', 'Meine Brötchen sind platt wie eine Flunder. {Name}, bist du drübergefahren?']],
    holz: [
      ['Gerhard', 'Das Brennholz ist da. Ofen an, Chronik auf. Danke an {name}.'],
      [
        'Katrin',
        'Bei mir liegt jetzt ein Stapel Holz vor der Tür. Ordentlich geschichtet. Das muss man erst mal können.',
      ],
    ],
    feuerwehr: [
      ['Manfred', 'Übung gut gelaufen. Schlauch liegt, Pumpe läuft, Kuchen ist alle. Danke an {name} für die Hilfe!'],
      ['Uwe', 'Und keiner nass geworden. Fast keiner.'],
    ],
    hilfe: [['Jens', '{Name} hat {wo} jemandem geholfen. Steht so in der Gruppe, also stimmt es.']],
    fest: [['Katrin', '{Name} war auch beim Fest. Getanzt hat {name} nicht, aber gegessen.']],
    // a step changes
    beliebt: [
      ['Gerhard', 'Für die Chronik: Die zwei vom Garten gehören inzwischen dazu.'],
      ['Ingrid', 'Ich finde, Falko und Sarah sind ganz in Ordnung. Das wollte ich nur mal gesagt haben.'],
    ],
    neutral: [['Katrin', 'Also, die zwei vom Garten. Man weiß nicht so recht. Aber man weiß ja nie so recht.']],
    misstrauisch: [
      ['Ingrid', 'Ich schließe jetzt immer ab. Seit die zwei vom Garten da sind.'],
      ['Jens', 'Wenn Falko oder Sarah klingeln: Ich bin nicht da.'],
    ],
    verhasst: [
      ['Manfred', 'Wer Falko oder Sarah sieht: Polizei anrufen. Und dann mich.'],
      ['Heike', 'Kürbissuppe gibt es für alle. Fast alle.'],
    ],
  };
  // the regional feed: now and then a post (a big deed, a good job, a new step)
  const FEED = {
    schlecht: [
      [
        'ratscher_rudi',
        'Ratscher-Ranking der Woche: 1. die Linde, 2. der Verkaufswagen, 3. {name}. Platz 3 war schon mal besser. #Ratscher',
      ],
      [
        'Schleusetal_Steffi',
        'In {Ort} erzählt man sich gerade einiges über {name}. Ich schreib nur, was ich höre. #Gerede',
      ],
    ],
    gut: [
      ['Kirmesbursche_Kai', 'Respekt an {name}! Hat {wo} mit angepackt. So geht Dorf. #{Ort}'],
      ['Bratwurstbaron', 'Endlich mal eine gute Nachricht aus {Ort}: {name} hilft, wo es klemmt. #Ehrenamt'],
    ],
  };
  // ---- spoken gossip: fixed fragments, one after another (a dynamic sentence = fixed pieces; every piece is recorded) ----
  const SPRUCH = {
    auf: ['Hast du schon gehört?', 'Weißt du das Neueste?', 'Unter uns gesagt:'],
    wer: {
      m: 'Der Falko hat',
      f: 'Die Sarah hat',
      '': 'Da hat einer',
    },
    wo: WO.map(q => q[1])
      .concat(['im Dorf', 'in Schleusingen'])
      .filter((w, i, a) => a.indexOf(w) === i),
    was: {
      grob: 'einen umgeschubst.',
      schlag: 'sich mit einem geprügelt.',
      klau: 'ein Auto mitgehen lassen.',
      raserei: 'Gas gegeben wie verrückt.',
      boeller: 'Böller geworfen.',
      garten: 'in fremden Gärten herumgeschnüffelt.',
      einbruch: 'eine Tür aufgebrochen.',
      flucht: 'die Polizei abgehängt.',
      sperre: 'eine Polizeisperre durchbrochen.',
      widerstand: 'sich mit der Polizei angelegt.',
      angeln: 'ohne Karte geangelt.',
      poebeln: 'Leute angepöbelt.',
      erwischt: 'sich von der Polizei erwischen lassen.',
      broetchen: 'die Brötchen ausgefahren.',
      holz: 'Brennholz gefahren.',
      feuerwehr: 'bei der Feuerwehr mitgemacht.',
      hilfe: 'jemandem geholfen.',
      fest: 'beim Fest mitgefeiert.',
    },
    // the last word: about a bad thing, a good thing; to the player himself when he is one of them
    zu: {
      schlecht: ['Ich sag ja nichts.', 'Das gibt es doch nicht.', 'Na, so was.'],
      gut: ['Ordentliche Leute.', 'So was hört man gern.', 'Das muss auch mal gesagt werden.'],
      ich: { m: 'Ach, du bist ja einer von denen.', f: 'Ach, du bist ja eine von denen.' },
    },
  };
  const GUT = new Set(['broetchen', 'holz', 'feuerwehr', 'hilfe', 'fest']);
  const gut = g => GUT.has(g);
  // the pieces of one sentence: [auf, wer, wo, was, zu] – r: a random number source (tests pass a fixed one)
  function spruch(g, wer, wo, o = {}) {
    const r = o.r || Math.random,
      pick = a => a[Math.floor(r() * a.length) % a.length];
    const was = SPRUCH.was[g];
    if (!was) return null;
    const w = SPRUCH.wer[wer] != null ? SPRUCH.wer[wer] : SPRUCH.wer[''],
      ort = SPRUCH.wo.includes(wo) ? wo : 'im Dorf',
      ich = o.ich && wer === o.ich ? SPRUCH.zu.ich[o.ich] : '',
      zu = ich || pick(gut(g) ? SPRUCH.zu.gut : SPRUCH.zu.schlecht);
    return [pick(SPRUCH.auf), w, ort, was, zu];
  }
  // a whole sentence for the subtitle: the pieces joined (the middle three are one clause)
  const satz = t => (t ? t[0] + ' ' + t[1] + ' ' + t[2] + ' ' + t[3] + ' ' + t[4] : '');
  // ---- a chat line with its words filled in ----
  const gross = s => s.charAt(0).toUpperCase() + s.slice(1);
  function fuell(text, f) {
    return String(text)
      .replace(/\{Name\}/g, gross(f.name || 'irgendeiner'))
      .replace(/\{name\}/g, f.name || 'irgendeiner')
      .replace(/\{Wo\}/g, gross(f.wo || 'im Dorf'))
      .replace(/\{wo\}/g, f.wo || 'im Dorf')
      .replace(/\{Ort\}/g, f.ort || 'Ratscher');
  }
  // ---- what a person says to the player now and then, by step (fixed lines; the same for every speaker) ----
  const SAGT = {
    beliebt: [
      'Na, ihr zwei! Schön, euch zu sehen.',
      'Grüß dich! Danke noch mal für neulich.',
      'Wenn ihr mal was braucht: Ich hab immer Kaffee da.',
    ],
    misstrauisch: [
      'Das ist doch der vom Garten. Pass auf deine Tasche auf.',
      'Guck nicht hin. Der guckt schon wieder.',
      'Man hört ja so einiges über euch.',
    ],
    verhasst: [
      'Mit dir rede ich nicht.',
      'Geh weiter. Hier gibt es nichts zu sehen.',
      'Ich hab die Polizei schon im Handy.',
    ],
    // the four answers of gl_reaktion.js: a greeting is answered by the step
    gruss: {
      beliebt: 'Na klar! Für euch immer. Komm, erzähl, was gibt es Neues?',
      misstrauisch: 'Hm. Ja. Guten Tag auch.',
      verhasst: 'Spar dir das.',
    },
    // a call to the police of somebody who cannot stand the two; the phone up to film them
    ruft: 'Ich ruf jetzt die Polizei. Die sollen sich das mal ansehen.',
    filmt: 'Lächeln! Das kommt ins Netz.',
  };
  // a whisper: it is shown as such (gl_reaktion.js puts it under the name)
  const LEISE = '(leise)';
  // ---- the HUD's small line when a step changes ----
  const HUD = {
    beliebt: 'Die Leute grüßen euch.',
    neutral: 'Man kennt euch. Mehr nicht.',
    misstrauisch: 'Es wird getuschelt.',
    verhasst: 'Die Leute rufen die Polizei.',
  };
  // every spoken line of the module for the recordings: [[who, text], …] (who: the cast ids that gossip or comment)
  function linien(wer) {
    const L = [],
      alles = [];
    alles.push(...SPRUCH.auf, ...Object.values(SPRUCH.wer), ...SPRUCH.wo, ...Object.values(SPRUCH.was));
    alles.push(...SPRUCH.zu.schlecht, ...SPRUCH.zu.gut, ...Object.values(SPRUCH.zu.ich));
    alles.push(
      ...SAGT.beliebt,
      ...SAGT.misstrauisch,
      ...SAGT.verhasst,
      ...Object.values(SAGT.gruss),
      SAGT.ruft,
      SAGT.filmt
    );
    for (const id of wer || []) for (const t of alles) L.push([id, t]);
    return L;
  }
  return {
    ORTE,
    NAME,
    MIN,
    MAX,
    STUFEN,
    HYST,
    IDX,
    stufe,
    clamp,
    TAT,
    KENNT,
    AHNT,
    NACHBAR,
    tat,
    ANDERES,
    VERGISST,
    vergessen,
    MARKT,
    ortVon,
    WO,
    woVon,
    WERNAME,
    AUSSEHEN,
    aussehen,
    GEREDE,
    FEED,
    SPRUCH,
    spruch,
    satz,
    gut,
    fuell,
    SAGT,
    LEISE,
    HUD,
    linien,
  };
})();
if (typeof window !== 'undefined') window.GLRUFDATA = GLRUFDATA;
