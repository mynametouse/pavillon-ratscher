// ===================== feat/laeden-leben 2: the goods one can buy – names, prices, weights, where they lie (WAREN) – pure =====================
// Falko (17.11.2026): „Man soll dort wirklich einkaufen können.“ Every block of goods that laeden/innen*.js puts on a shelf belongs to a
// department (the palette it was coloured from: LIMARKT.PAL, LIBAU.DEPT) and is a kind of package (box, bottle, can, bag, jar, pack,
// heap, loaf, crate, eimer); WAREN turns that into a product with a plain German name, a price as in a German shop in 2026 (rounded
// like shelf prices: ,49 ,99 …), a weight and a picture kind – generic products, no brands. Useful things first: food and drinks,
// flowers and plants, timber, screws, paint and tools for the garden and the workshop, a torch and a crowbar for the Grenzland mode.
// No imports (node tests: viz3/test/unit/laeden_leben.test.mjs).
//   WAREN.get(id) → { id, name, preis (cent), kg, art, farbe, cat, nutzen } · WAREN.fuer(cat, kind, seed) → id · WAREN.euro(cent) → '1,49 €'
//   WAREN.CAT (departments) · WAREN.list(cat?) · WAREN.farbenKarte(LIMARKT, LIBAU) → Map(colour array → department) for the shops' plans
export const WAREN = (() => {
  // [id, name, price in cent, kg, picture kind, department, the package kinds it lies as, what it is good for]
  const T = [
    // ---- coffee, tea, breakfast ----
    ['kaffee', 'Kaffee, gemahlen 500 g', 699, 0.5, 'bag', 'kaffee', ['bag', 'box'], 'essen'],
    ['kaffeebohnen', 'Kaffeebohnen 1 kg', 1399, 1, 'bag', 'kaffee', ['bag'], 'essen'],
    ['tee', 'Früchtetee, 20 Beutel', 149, 0.05, 'box', 'kaffee', ['box'], 'essen'],
    ['instant', 'Löslicher Kaffee 200 g', 549, 0.2, 'jar', 'kaffee', ['jar'], 'essen'],
    ['haferflocken', 'Haferflocken 500 g', 89, 0.5, 'box', 'fruehstueck', ['box'], 'essen'],
    ['muesli', 'Früchtemüsli 750 g', 279, 0.75, 'box', 'fruehstueck', ['box'], 'essen'],
    ['marmelade', 'Erdbeerkonfitüre 450 g', 199, 0.45, 'jar', 'fruehstueck', ['jar'], 'essen'],
    ['honig', 'Blütenhonig 500 g', 449, 0.5, 'jar', 'fruehstueck', ['jar'], 'essen'],
    // ---- tins and jars ----
    ['tomaten_dose', 'Tomaten, gehackt 400 g', 89, 0.4, 'can', 'konserven', ['can'], 'essen'],
    ['bohnen', 'Weiße Bohnen 400 g', 119, 0.4, 'can', 'konserven', ['can'], 'essen'],
    ['erbsensuppe', 'Erbseneintopf 800 g', 229, 0.8, 'can', 'konserven', ['can'], 'essen'],
    ['mais', 'Gemüsemais 340 g', 99, 0.34, 'can', 'konserven', ['can'], 'essen'],
    ['gurken', 'Gewürzgurken 670 g', 179, 0.67, 'jar', 'konserven', ['jar'], 'essen'],
    // ---- pasta, rice ----
    ['nudeln', 'Spirelli 500 g', 129, 0.5, 'bag', 'nudeln', ['bag'], 'essen'],
    ['spaghetti', 'Spaghetti 500 g', 119, 0.5, 'box', 'nudeln', ['box'], 'essen'],
    ['reis', 'Langkornreis 1 kg', 229, 1, 'bag', 'nudeln', ['bag', 'box'], 'essen'],
    ['kloesse', 'Kloßteig Thüringer Art 750 g', 249, 0.75, 'box', 'nudeln', ['box'], 'essen'],
    // ---- spices, oil ----
    ['oel', 'Sonnenblumenöl 1 l', 249, 0.95, 'bottle', 'gewuerze', ['bottle'], 'essen'],
    ['essig', 'Kräuteressig 750 ml', 99, 0.8, 'bottle', 'gewuerze', ['bottle'], 'essen'],
    ['salz', 'Speisesalz 500 g', 59, 0.5, 'jar', 'gewuerze', ['jar'], 'essen'],
    ['senf', 'Mittelscharfer Senf 200 ml', 89, 0.25, 'jar', 'gewuerze', ['jar'], 'essen'],
    // ---- sweets, snacks ----
    ['schokolade', 'Vollmilchschokolade 100 g', 149, 0.1, 'box', 'suess', ['box'], 'essen'],
    ['kekse', 'Butterkekse 200 g', 129, 0.2, 'box', 'suess', ['box'], 'essen'],
    ['gummibaer', 'Fruchtgummi 200 g', 119, 0.2, 'bag', 'suess', ['bag'], 'essen'],
    ['chips', 'Kartoffelchips 175 g', 199, 0.18, 'bag', 'knabber', ['bag'], 'essen'],
    ['salzstangen', 'Salzstangen 250 g', 99, 0.25, 'bag', 'knabber', ['bag'], 'essen'],
    // ---- baking ----
    ['mehl', 'Weizenmehl Type 405, 1 kg', 99, 1, 'bag', 'backen', ['bag'], 'essen'],
    ['zucker', 'Zucker 1 kg', 109, 1, 'box', 'backen', ['box', 'bag'], 'essen'],
    ['backpulver', 'Backpulver, 5 Päckchen', 79, 0.08, 'box', 'backen', ['box'], 'essen'],
    // ---- chemist, household, pets ----
    ['duschgel', 'Duschgel 250 ml', 129, 0.28, 'bottle', 'drogerie', ['bottle'], 'haus'],
    ['zahnpasta', 'Zahncreme 75 ml', 95, 0.1, 'box', 'drogerie', ['box'], 'haus'],
    ['pflaster', 'Pflaster, 20 Stück', 179, 0.03, 'box', 'drogerie', ['box'], 'haus'],
    ['spuelmittel', 'Spülmittel 500 ml', 99, 0.55, 'bottle', 'haushalt', ['bottle'], 'haus'],
    ['klopapier', 'Toilettenpapier, 8 Rollen', 399, 0.9, 'pack', 'haushalt', ['pack'], 'haus'],
    ['kuechenrolle', 'Küchenrolle, 4 Rollen', 279, 0.6, 'pack', 'haushalt', ['pack'], 'haus'],
    ['batterien', 'Batterien AA, 8 Stück', 499, 0.2, 'box', 'haushalt', ['box'], 'werkzeug'],
    ['katzenfutter', 'Katzenfutter 400 g', 89, 0.4, 'can', 'tier', ['can'], 'tier'],
    ['hundefutter', 'Hundetrockenfutter 3 kg', 799, 3, 'bag', 'tier', ['bag'], 'tier'],
    // ---- drinks ----
    ['rotwein', 'Rotwein trocken 0,75 l', 499, 1.25, 'bottle', 'wein', ['bottle'], 'trinken'],
    ['sekt', 'Sekt 0,75 l', 349, 1.3, 'bottle', 'wein', ['bottle'], 'trinken'],
    ['wasser', 'Mineralwasser 1,5 l (+0,25 € Pfand)', 64, 1.55, 'bottle', 'wasser', ['bottle'], 'trinken'],
    ['saft', 'Apfelsaft 1 l', 179, 1.05, 'bottle', 'wasser', ['bottle', 'box'], 'trinken'],
    ['bier', 'Kasten Pils 20 × 0,5 l (+3,10 € Pfand)', 2009, 17, 'crate', 'wasser', ['crate'], 'trinken'],
    ['wasserkasten', 'Kasten Mineralwasser 12 × 0,7 l (+3,30 € Pfand)', 879, 14, 'crate', 'wasser', [], 'trinken'],
    // ---- chilled, frozen ----
    ['milch', 'Frische Vollmilch 1 l', 119, 1.03, 'box', 'milch', ['box'], 'essen'],
    ['joghurt', 'Joghurt mild 500 g', 129, 0.5, 'jar', 'milch', ['jar'], 'essen'],
    ['butter', 'Deutsche Markenbutter 250 g', 229, 0.25, 'pack', 'milch', ['pack'], 'essen'],
    ['gouda', 'Gouda in Scheiben 200 g', 249, 0.2, 'pack', 'kaese', ['pack', 'box'], 'essen'],
    ['quark', 'Speisequark 500 g', 119, 0.5, 'jar', 'kaese', ['jar'], 'essen'],
    ['bratwurst', 'Thüringer Rostbratwurst, 5 Stück', 449, 0.5, 'pack', 'wurst', ['pack', 'box'], 'essen'],
    ['aufschnitt', 'Aufschnitt 200 g', 199, 0.2, 'jar', 'wurst', ['jar'], 'essen'],
    ['pizza', 'Tiefkühlpizza Salami', 299, 0.35, 'box', 'tk', ['box', 'pack'], 'essen'],
    ['pommes', 'Pommes frites 1 kg', 249, 1, 'box', 'tk', [], 'essen'],
    // ---- fruit and vegetables (loose: one bag) ----
    ['aepfel', 'Äpfel 1 kg', 249, 1, 'heap', 'obst', ['heap'], 'essen'],
    ['bananen', 'Bananen 1 kg', 169, 1, 'heap', 'obst', [], 'essen'],
    ['tomaten', 'Rispentomaten 500 g', 199, 0.5, 'heap', 'gemuese', ['heap'], 'essen'],
    ['kartoffeln', 'Speisekartoffeln 2,5 kg', 299, 2.5, 'heap', 'gemuese', [], 'essen'],
    ['moehren', 'Möhren 1 kg', 129, 1, 'heap', 'gemuese', [], 'essen'],
    ['orangen', 'Orangen, Netz 1,5 kg', 249, 1.5, 'heap', 'obst', [], 'essen'],
    ['birnen', 'Birnen 1 kg', 299, 1, 'heap', 'obst', [], 'essen'],
    ['trauben', 'Weintrauben hell 500 g', 249, 0.5, 'heap', 'obst', [], 'essen'],
    ['pflaumen', 'Pflaumen 1 kg', 299, 1, 'heap', 'obst', [], 'essen'],
    ['salat', 'Eisbergsalat, ein Kopf', 129, 0.5, 'heap', 'gemuese', [], 'essen'],
    ['gurke', 'Salatgurke, ein Stück', 79, 0.4, 'heap', 'gemuese', [], 'essen'],
    ['zwiebeln', 'Zwiebeln 1 kg', 129, 1, 'heap', 'gemuese', [], 'essen'],
    // ---- bakery ----
    ['broetchen', 'Brötchen', 45, 0.06, 'heap', 'brot', ['heap'], 'essen'],
    ['brot', 'Bauernbrot 1 kg', 349, 1, 'loaf', 'brot', ['loaf'], 'essen'],
    ['pfannkuchen', 'Pfannkuchen (Berliner)', 150, 0.08, 'heap', 'brot', [], 'essen'],
    ['streusel', 'Streuselkuchen, ein Stück', 220, 0.12, 'heap', 'brot', [], 'essen'],
    ['kaffee_becher', 'Kaffee zum Mitnehmen', 220, 0.3, 'jar', 'brot', [], 'trinken'],
    // ---- flowers and plants ----
    ['strauss', 'Blumenstrauß', 499, 0.4, 'heap', 'pflanzen', [], 'blumen'],
    ['topfblume', 'Topfblume (Alpenveilchen)', 399, 0.6, 'heap', 'pflanzen', ['heap'], 'blumen'],
    ['kraeuter', 'Kräuter im Topf (Basilikum)', 199, 0.3, 'heap', 'pflanzen', [], 'garten'],
    // ---- the DIY store ----
    ['hammer', 'Schlosserhammer 500 g', 1299, 0.65, 'box', 'werkzeug', ['box'], 'werkzeug'],
    ['saege', 'Fuchsschwanz 450 mm', 1499, 0.5, 'box', 'werkzeug', ['box'], 'werkzeug'],
    ['zollstock', 'Zollstock 2 m', 799, 0.15, 'box', 'werkzeug', ['box'], 'werkzeug'],
    ['handschuhe', 'Arbeitshandschuhe', 499, 0.1, 'box', 'werkzeug', ['box'], 'werkzeug'],
    ['lasur', 'Holzlasur 2,5 l', 2499, 2.8, 'eimer', 'farben', ['eimer'], 'werkstatt'],
    ['wandfarbe', 'Wandfarbe weiß 10 l', 3999, 14, 'eimer', 'farben', ['eimer'], 'werkstatt'],
    ['leinoel', 'Leinölfirnis 1 l', 1099, 0.95, 'eimer', 'farben', [], 'werkstatt'],
    ['pinsel', 'Pinselset, 3 Stück', 699, 0.15, 'box', 'farben', [], 'werkstatt'],
    ['lampe', 'LED-Taschenlampe', 999, 0.2, 'box', 'elektro', ['box'], 'werkzeug'],
    ['kabeltrommel', 'Kabeltrommel 25 m', 3499, 4.5, 'box', 'elektro', [], 'werkzeug'],
    ['dichtband', 'Gewindedichtband', 249, 0.05, 'box', 'sanitaer', ['box', 'pack'], 'haus'],
    ['schrauben', 'Holzschrauben 4 × 40, 200 Stück', 899, 0.5, 'box', 'eisenwaren', ['box'], 'werkstatt'],
    ['naegel', 'Drahtstifte 2,5 × 55, 1 kg', 549, 1, 'box', 'eisenwaren', [], 'werkstatt'],
    ['brecheisen', 'Kuhfuß (Brecheisen) 600 mm', 1299, 1.4, 'box', 'eisenwaren', [], 'werkzeug'],
    ['gluehbirne', 'LED-Lampe E27', 349, 0.06, 'box', 'leuchten', ['box', 'pack'], 'haus'],
    ['eimer', 'Eimer 10 l', 299, 0.4, 'box', 'haushaltobi', ['box', 'bottle'], 'haus'],
    ['blumenerde', 'Blumenerde 40 l', 699, 12, 'bag', 'garten', ['bag'], 'garten'],
    ['saatgut', 'Saatgut Radieschen', 199, 0.02, 'box', 'garten', ['box'], 'garten'],
    ['rasensamen', 'Rasensamen 1 kg', 1299, 1, 'box', 'garten', [], 'garten'],
    ['laminat', 'Laminat Eiche, Paket 2,2 m²', 1999, 16, 'pack', 'boden', ['pack'], 'werkstatt'],
    ['fliesen', 'Bodenfliesen, Paket 1,4 m²', 2499, 22, 'pack', 'fliesen', ['pack'], 'werkstatt'],
    ['zement', 'Zement 25 kg', 699, 25, 'bag', 'baustoffe', ['bag'], 'werkstatt'],
    ['latte', 'Dachlatte 24 × 48 mm, 2,5 m', 279, 1.4, 'pack', 'holz', ['pack'], 'werkstatt'],
    ['brett', 'Brett Fichte 19 × 140 mm, 2,5 m', 799, 3.2, 'pack', 'holz', ['pack'], 'werkstatt'],
    ['kantholz', 'Kantholz 60 × 60 mm, 2,5 m', 649, 4.5, 'pack', 'holz', [], 'werkstatt'],
    ['leimholz', 'Leimholzplatte Buche 18 mm, 80 × 40 cm', 1999, 3.6, 'pack', 'holz', [], 'werkstatt'],
    ['strauch', 'Strauch im Topf (Forsythie)', 1299, 6, 'heap', 'pflanzen', [], 'garten'],
    // ---- papers and tickets of the public buildings (einkauf/oeffentlich.js) – never on a shelf ----
    ['meldebescheinigung', 'Meldebescheinigung der Stadt Schleusingen', 1000, 0.01, 'pack', 'papier', [], 'papier'],
    ['gelbesaecke', 'Gelbe Säcke, eine Rolle', 0, 0.3, 'pack', 'papier', [], 'haus'],
    ['museumskarte', 'Eintrittskarte Naturhistorisches Museum', 600, 0.01, 'pack', 'papier', [], 'papier'],
    ['turmkarte', 'Eintrittskarte Turm der Bertholdsburg', 200, 0.01, 'pack', 'papier', [], 'papier'],
    ['buch', 'Buch aus der Stadtbibliothek', 0, 0.5, 'box', 'papier', [], 'papier'],
    ['briefmarke', 'Briefmarke Standardbrief 0,95 €', 95, 0.01, 'pack', 'papier', [], 'papier'],
  ];
  const CAT = {
    kaffee: 'Kaffee · Tee',
    fruehstueck: 'Frühstück',
    konserven: 'Konserven',
    nudeln: 'Nudeln · Reis',
    gewuerze: 'Gewürze · Öl',
    suess: 'Süßwaren',
    knabber: 'Knabbereien',
    backen: 'Backzutaten',
    drogerie: 'Drogerie',
    haushalt: 'Haushalt',
    tier: 'Tierbedarf',
    wein: 'Wein · Sekt',
    wasser: 'Getränke',
    milch: 'Molkerei',
    kaese: 'Käse',
    wurst: 'Wurst · Fleisch',
    tk: 'Tiefkühl',
    obst: 'Obst',
    gemuese: 'Gemüse',
    brot: 'Backwaren',
    pflanzen: 'Pflanzen · Blumen',
    werkzeug: 'Werkzeug',
    farben: 'Farben',
    elektro: 'Elektro',
    sanitaer: 'Sanitär',
    eisenwaren: 'Eisenwaren',
    leuchten: 'Leuchten',
    haushaltobi: 'Haushalt',
    garten: 'Garten',
    boden: 'Bodenbeläge',
    fliesen: 'Fliesen',
    baustoffe: 'Baustoffe',
    holz: 'Holz',
    papier: 'Papiere · Karten',
  };
  // the departments of the DIY store by their boards (LIBAU.DEPT names)
  const DEPTCAT = {
    Werkzeug: 'werkzeug',
    Farben: 'farben',
    Elektro: 'elektro',
    Sanitär: 'sanitaer',
    Eisenwaren: 'eisenwaren',
    Leuchten: 'leuchten',
    Haushalt: 'haushaltobi',
    Garten: 'garten',
    Bodenbeläge: 'boden',
    Fliesen: 'fliesen',
    Baustoffe: 'baustoffe',
    Holz: 'holz',
  };
  const ITEMS = new Map();
  for (const [id, name, preis, kg, art, cat, kinds, nutzen] of T)
    ITEMS.set(id, { id, name, preis, kg, art, cat, kinds, nutzen, farbe: null });
  const get = id => ITEMS.get(id) || null;
  const list = cat => [...ITEMS.values()].filter(w => !cat || w.cat === cat);
  // the product of a block of goods: its department and package kind (a stable choice by seed among those that fit)
  function fuer(cat, kind, seed = 0) {
    if (!cat) return null;
    let c = list(cat).filter(w => w.kinds.includes(kind));
    if (!c.length) c = list(cat).filter(w => w.kinds.length);
    if (!c.length) c = list(cat);
    if (!c.length) return null;
    const i = Math.abs(Math.floor(seed)) % c.length;
    return c[i].id;
  }
  // 1,49 € – 0 € – 12,00 €
  const euro = c => {
    const n = Math.round(c);
    const s = (n < 0 ? '−' : '') + Math.floor(Math.abs(n) / 100) + ',' + String(Math.abs(n) % 100).padStart(2, '0');
    return s.replace(/\B(?=(\d{3})+(?!\d))/, '.') + ' €';
  };
  // the departments by the colours the shops' layouts paint their goods with (the same array objects end up in each plan's goods)
  function farbenKarte(LIMARKT, LIBAU) {
    const M = new Map();
    if (LIMARKT && LIMARKT.PAL) for (const [k, pal] of Object.entries(LIMARKT.PAL)) for (const c of pal) M.set(c, k);
    if (LIMARKT && LIMARKT.C) {
      M.set(LIMARKT.C.bread, 'brot');
      M.set(LIMARKT.C.breadD, 'brot');
      for (const k of ['crateA', 'crateB', 'crateC', 'crateD']) if (LIMARKT.C[k]) M.set(LIMARKT.C[k], 'wasser');
    }
    if (LIBAU) {
      for (const d of LIBAU.DEPT || [])
        for (const c of d[1] || []) if (!M.has(c)) M.set(c, DEPTCAT[d[0]] || 'werkzeug');
      const B = LIBAU.B || {};
      for (const c of [...(B.plant || []), ...(B.bloom || [])]) M.set(c, 'pflanzen');
      if (B.board) M.set(B.board, 'holz');
      for (const c of B.soil || []) M.set(c, 'garten');
    }
    return M;
  }
  // what lies in a crate or on a table, by the colour it was painted with (the palettes of laeden/innen_markt.js and innen_bau.js, in their
  // order: fruit – red, orange, yellow, green, light green, purple; vegetables – green, orange, red, brown, pale, green; the bakery's
  // two browns; the plants and their blossoms)
  function heapKarte(LIMARKT, LIBAU) {
    const M = new Map(),
      put = (pal, ids) => (pal || []).forEach((c, i) => ids[i] && M.set(c, ids[i]));
    if (LIMARKT && LIMARKT.PAL) {
      put(LIMARKT.PAL.obst, ['aepfel', 'orangen', 'bananen', 'birnen', 'trauben', 'pflaumen']);
      put(LIMARKT.PAL.gemuese, ['salat', 'moehren', 'tomaten', 'kartoffeln', 'zwiebeln', 'gurke']);
    }
    if (LIMARKT && LIMARKT.C) {
      M.set(LIMARKT.C.bread, 'broetchen');
      M.set(LIMARKT.C.breadD, 'brot');
    }
    if (LIBAU && LIBAU.B) {
      for (const c of LIBAU.B.plant || []) M.set(c, 'kraeuter');
      for (const c of LIBAU.B.bloom || []) M.set(c, 'topfblume');
    }
    return M;
  }
  return { get, list, fuer, euro, farbenKarte, heapKarte, CAT, DEPTCAT, ITEMS };
})();
if (typeof window !== 'undefined') window.WAREN = WAREN;
