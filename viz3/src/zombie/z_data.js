// ===================== feat/zombie: the zombie night as data – weapons, supplies, loot, zombies, nights, texts (ZDATA) =====================
// Falko, 4.11.2026: at the sound of the siren people turn into zombies that roam at night and attack; kill them with a chainsaw or
// whatever weapon one finds, run them over, prepare by day, gather supplies, barricade houses, join with other survivors. Pure data and
// small pure helpers – the modules below read it (zombie/z_*.js). Numbers are per hit / per second, distances in metres, times in seconds
// (game minutes where it says so).
export const ZDATA = (() => {
  // ---- weapons: melee (dmg per hit, reach, arc in degrees, cd = time between swings, knock = push back in m, stam = stamina per swing,
  // wear = condition lost per hit of 100), the chainsaw (dps while cutting, fuel in litres), the shotgun (pellets) ----
  const WEAPONS = {
    tritt: {
      name: 'Tritt',
      dmg: 6,
      reach: 1.25,
      arc: 60,
      cd: 0.9,
      knock: 3.4,
      stam: 12,
      kind: 'blunt',
      gest: 'push',
      wind: 0.2,
    },
    faust: {
      name: 'Fäuste',
      dmg: 9,
      reach: 1.15,
      arc: 70,
      cd: 0.55,
      knock: 0.9,
      stam: 6,
      kind: 'blunt',
      gest: 'push',
      wind: 0.18,
    },
    axt: {
      name: 'Axt',
      dmg: 58,
      reach: 1.7,
      arc: 62,
      cd: 0.95,
      knock: 1.4,
      stam: 14,
      kind: 'blade',
      gore: 0.55,
      wear: 0.6,
      gest: 'chop',
      wind: 0.42,
      desc: 'Spaltaxt aus der Holzlege – schwer, trifft hart, trennt Glieder ab.',
    },
    beil: {
      name: 'Beil',
      dmg: 36,
      reach: 1.35,
      arc: 58,
      cd: 0.6,
      knock: 0.9,
      stam: 8,
      kind: 'blade',
      gore: 0.35,
      wear: 0.8,
      gest: 'chop',
      wind: 0.26,
      desc: 'Handbeil zum Anfeuern – schnell, aber kurz.',
    },
    spaten: {
      name: 'Spaten',
      dmg: 36,
      reach: 1.95,
      arc: 84,
      cd: 0.85,
      knock: 2.6,
      stam: 12,
      kind: 'blunt',
      wear: 0.5,
      gest: 'chop',
      wind: 0.36,
      desc: 'Lang und breit – schlägt sie weit zurück.',
    },
    mistgabel: {
      name: 'Mistgabel',
      dmg: 32,
      reach: 2.35,
      arc: 32,
      cd: 0.75,
      knock: 1.9,
      stam: 10,
      kind: 'pierce',
      gore: 0.25,
      wear: 0.6,
      gest: 'push',
      wind: 0.3,
      desc: 'Hält sie auf Abstand.',
    },
    brechstange: {
      name: 'Brechstange',
      dmg: 44,
      reach: 1.6,
      arc: 60,
      cd: 0.78,
      knock: 1.7,
      stam: 11,
      kind: 'blunt',
      wear: 0.25,
      gest: 'chop',
      wind: 0.3,
      desc: 'Stahl, unverwüstlich. Öffnet auch verschlossene Schränke.',
    },
    sense: {
      name: 'Sense',
      dmg: 62,
      reach: 2.45,
      arc: 118,
      cd: 1.35,
      knock: 1.0,
      stam: 19,
      kind: 'blade',
      gore: 0.75,
      wear: 0.9,
      gest: 'chop',
      wind: 0.5,
      desc: 'Mäht durch mehrere auf einmal – langsam auszuholen.',
    },
    motorsaege: {
      name: 'Motorsäge',
      dps: 150,
      reach: 1.45,
      arc: 52,
      kind: 'saw',
      gore: 1,
      tank: 0.5,
      idle: 0.0025,
      cut: 0.012,
      loud: 70,
      stam: 4,
      desc: 'Zweitakter, 0,5 l Tank (Gemisch 1:50). Laut – das hören sie weit.',
    },
    flinte: {
      name: 'Doppelflinte',
      dmg: 26,
      pellets: 9,
      spread: 5.5,
      range: 32,
      shots: 2,
      reload: 2.3,
      cd: 0.35,
      knock: 2.2,
      kind: 'gun',
      gore: 0.8,
      loud: 220,
      desc: 'Doppelflinte Kaliber 12 aus dem Waffenschrank des Jägers. Zwei Schuss, dann nachladen (R).',
    },
  };
  // where the weapons lie when the night begins: near a jump spot of the menu (KERN.spot), off [dx, dy] metres, on the first free place
  const PLACES = [
    { id: 'spaten', spot: 'garage', off: [1.4, 1.1], why: 'an der alten Garage' },
    { id: 'beil', spot: 'holzhaus', off: [0.9, -0.8], why: 'am Hackklotz beim Holzhaus' },
    { id: 'axt', spot: 'hubert', off: [0.8, -1.6], why: 'an Huberts Holzlege' },
    { id: 'mistgabel', spot: 'ziegen', off: [-1.2, 0.9], why: 'an der Ziegenweide' },
    { id: 'brechstange', spot: 'werkstatt', off: [0.9, 1.1], why: 'in der Werkstatt' },
    { id: 'motorsaege', spot: 'werkstatt', off: [-0.8, 1.4], why: 'in der Werkstatt, mit einem Kanister Gemisch' },
    // Falko 5.11.2026: „Bei Hubert sollte eine doppelläufige Schrotflinte samt Munition liegen, damit man erstmal starten kann“
    { id: 'flinte', at: 'hoftisch', why: 'auf Huberts Tisch vor der Werkstatt, mit einer Schachtel Schrot' },
  ];
  // ---- supplies: counted in the backpack (not things in the hand) ----
  const ITEMS = {
    konserve: { name: 'Konserve', pl: 'Konserven', food: 30, icon: '🥫' },
    glas: { name: 'Einweckglas', pl: 'Einweckgläser', food: 22, icon: '🫙' },
    brot: { name: 'Brot', pl: 'Brot', food: 18, icon: '🍞' },
    wasser: { name: 'Flasche Wasser', pl: 'Flaschen Wasser', drink: 40, icon: '💧' },
    verband: { name: 'Verbandskasten', pl: 'Verbandskästen', heal: 40, icon: '🩹' },
    schmerz: { name: 'Schmerztabletten', pl: 'Schmerztabletten', heal: 15, icon: '💊' },
    brett: { name: 'Brett', pl: 'Bretter', icon: '🪵' },
    nagel: { name: 'Nägel (Hand voll)', pl: 'Hand voll Nägel', icon: '🔩' },
    benzin: { name: 'Liter Benzin', pl: 'Liter Benzin', icon: '⛽' },
    schrot: { name: 'Schrotpatrone', pl: 'Schrotpatronen', icon: '🔴' },
    batterie: { name: 'Batterie', pl: 'Batterien', icon: '🔋' },
    flasche: { name: 'leere Flasche', pl: 'leere Flaschen', icon: '🍾' },
    lappen: { name: 'Lappen', pl: 'Lappen', icon: '🧻' },
    schnaps: { name: 'Kräuterschnaps', pl: 'Kräuterschnaps', heal: 5, icon: '🥃' },
  };
  // ---- loot by container (kinds from zombie/z_innen.js): [item, chance, min, max] – rolled once per container from the house seed ----
  const LOOT = {
    schublade: [
      ['nagel', 0.25, 1, 2],
      ['batterie', 0.3, 1, 2],
      ['lappen', 0.35, 1, 1],
      ['schmerz', 0.15, 1, 1],
      ['schrot', 0.05, 2, 4],
    ],
    schrank: [
      ['konserve', 0.35, 1, 2],
      ['lappen', 0.3, 1, 2],
      ['flasche', 0.25, 1, 2],
      ['verband', 0.12, 1, 1],
    ],
    buefett: [
      ['konserve', 0.5, 1, 3],
      ['glas', 0.4, 1, 2],
      ['brot', 0.25, 1, 1],
      ['schnaps', 0.2, 1, 1],
      ['flasche', 0.3, 1, 2],
    ],
    kuehlschrank: [
      ['wasser', 0.55, 1, 3],
      ['glas', 0.3, 1, 2],
      ['brot', 0.2, 1, 1],
    ],
    regal: [
      ['glas', 0.7, 2, 6],
      ['konserve', 0.35, 1, 3],
      ['flasche', 0.3, 1, 3],
    ],
    truhe: [
      ['lappen', 0.4, 1, 3],
      ['brett', 0.3, 1, 3],
      ['schrot', 0.08, 2, 6],
    ],
    kleiderschrank: [
      ['lappen', 0.5, 1, 3],
      ['verband', 0.08, 1, 1],
    ],
    nachttisch: [
      ['schmerz', 0.35, 1, 1],
      ['batterie', 0.25, 1, 2],
    ],
    werkbank: [
      ['nagel', 0.75, 2, 5],
      ['brett', 0.5, 1, 4],
      ['benzin', 0.25, 1, 2],
    ],
    kiste: [
      ['brett', 0.5, 2, 5],
      ['nagel', 0.4, 1, 3],
      ['benzin', 0.15, 1, 1],
    ],
    waffenschrank: [['schrot', 1, 6, 12]],
    auto: [
      ['verband', 0.9, 1, 1],
      ['benzin', 0.35, 1, 3],
      ['wasser', 0.3, 1, 1],
      ['lappen', 0.3, 1, 1],
    ],
  };
  // a small deterministic generator (the same house always holds the same)
  function rng(seed) {
    let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
    const f = () => (s = (s * 16807) % 2147483647) / 2147483647;
    f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  }
  function roll(kind, seed) {
    const T = LOOT[kind] || LOOT.schrank,
      r = rng(seed),
      out = {};
    for (const [k, p, a, b] of T) if (r() < p) out[k] = (out[k] || 0) + r.int(a, b);
    return out;
  }
  // ---- the zombies: per night a little more of everything ----
  const ZOMBIE = {
    hp: 100,
    r: 0.3,
    walk: 0.62, // shambling, m/s
    chase: 2.05, // having seen you
    sight: 24, // m, at night with some light around
    sightDark: 14,
    hear: 1, // × the loudness of a noise
    reach: 1.05,
    hit: 12,
    cd: 1.35,
    wind: 0.45,
    bang: 9, // per blow on a barricade
  };
  // ---- how hard (Falko 5.11., 17:57: „Schwierigkeit wählbar“): how many, how tough, how hard they hit, how fast, how far they see,
  // how long the first day lasts (minutes of daylight before the siren) ----
  const DIFF = {
    leicht: { name: 'leicht', count: 0.6, hp: 0.8, hit: 0.6, speed: 0.9, sight: 0.8, day: 360 },
    normal: { name: 'normal', count: 1, hp: 1, hit: 1, speed: 1, sight: 1, day: 240 },
    schwer: { name: 'schwer', count: 1.4, hp: 1.25, hit: 1.4, speed: 1.12, sight: 1.15, day: 150 },
  };
  const diffOf = k => DIFF[k] || DIFF.normal;
  // ---- the kinds (Falko 5.11., 17:57: „Neue Zombie-Arten“): from the second night on runners, a firefighter in his helmet (tough,
  // the helmet takes the blows to the head), a screamer (when it sees you it screams, and all around come); more every night ----
  const KINDS = {
    normal: { name: 'Zombie', hp: 1, speed: 1, walk: 1, hit: 1 },
    laeufer: { name: 'Läufer', hp: 0.75, speed: 1.55, walk: 1.35, hit: 0.9 },
    feuerwehr: { name: 'Feuerwehrmann', hp: 2.6, speed: 0.85, walk: 0.9, hit: 1.3, helm: 70 },
    schreier: { name: 'Schreier', hp: 0.7, speed: 1.1, walk: 1.05, hit: 0.8, scream: 60 },
  };
  // the first night as it was; then each night: the share of runners, how many firefighters and screamers at most
  const kindsOf = n =>
    n <= 1
      ? { laeufer: 0, feuerwehr: 0, schreier: 0 }
      : { laeufer: Math.min(0.4, 0.14 + 0.08 * (n - 2)), feuerwehr: Math.min(4, n - 1), schreier: Math.min(3, n - 1) };
  const night = (n, dk) => {
    const D = diffOf(dk);
    return {
      count: Math.round(Math.min(30, 6 + 4 * n) * D.count),
      speed: (1 + Math.min(0.5, 0.07 * (n - 1))) * D.speed,
      hit: (ZOMBIE.hit + 2 * (n - 1)) * D.hit,
      hp: (ZOMBIE.hp + 10 * (n - 1)) * D.hp,
      lurkers: Math.min(8, 1 + n),
      sight: D.sight,
      kinds: kindsOf(n),
    };
  };
  // ---- times of day (game minutes after midnight) ----
  const TIME = { warn: 20 * 60 + 30, siren: 21 * 60, dawn: 5 * 60 + 30, start: 16 * 60 + 30 };
  // ---- texts (German, the player is du) ----
  const T = {
    intro:
      'Ratscher, 31. Oktober, früher Nachmittag. Seit Tagen ist das Radio voller Rauschen. Wenn es dunkel wird, heult die Sirene auf der alten Schule – such dir vorher etwas, womit du dich wehren kannst (Huberts Doppelflinte mit Schrot liegt auf seinem Tisch vor der Werkstatt, gleich westlich vom Garten; Spaten an der alten Garage, Motorsäge in der Werkstatt), sammle Vorräte in den Häusern und vernagle Fenster. Y oder Klick: zuschlagen, G: Tritt, T: Taschenlampe, R: nachladen, C: ducken – geduckt sehen sie dich schlechter, und wer nichts ahnt, trifft dein Schlag dreifach. Die Schwierigkeit stellst du im Panel ein.',
    warn: 'Die Sonne geht unter. Bald heult die Sirene.',
    siren: 'Die Sirene heult. Irgendetwas stimmt mit den Leuten nicht …',
    turn: name => name + ' krümmt sich – und dreht sich langsam zu dir um.',
    dawn: 'Entwarnung. Ein langer Ton über dem Tal – sie verkriechen sich in Keller und Scheunen.',
    survived: n => 'Du hast die ' + n + '. Nacht überlebt.',
    dead: 'Sie haben dich erwischt.',
    respawn: 'Du kommst im Morgengrauen zu dir. Ein Teil der Vorräte ist weg.',
    hungry: 'Mein Magen knurrt. Ich sollte etwas essen.',
    starving: 'Ich bin völlig entkräftet – ich brauche etwas zu essen.',
    noFuel: 'Kein Benzin mehr im Tank.',
    refuel: 'Nachgetankt.',
    noShells: 'Keine Patronen mehr.',
    reload: 'Nachgeladen.',
    broken: name => name + ' ist kaputt.',
  };
  return { WEAPONS, PLACES, ITEMS, LOOT, rng, roll, ZOMBIE, night, TIME, T, DIFF, diffOf, KINDS, kindsOf };
})();
window.ZDATA = ZDATA;
