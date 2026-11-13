// Suhl runtime, in the worker: the look of single buildings after photos (stage 3, „Fassaden nach Fotos“) – per building record of
// product g: the wall colour, a material, light window surrounds, the frame colour, the roof's colour, dormers yes or no, no balconies.
// Taken from freely licensed photos on Wikimedia Commons that stand with their camera position (the contact sheets of suhl-fotos on
// the scratch branch ref/suhl-fotos, credits there in commons/CREDITS.md) and checked against the model seen from the same place;
// colours as they read in daylight (sRGB). A stand-in until the pipeline writes them into the records themselves (field S per side).
// mat: putz, schiefer (slate all over), schiefer_og (slate above a plastered ground floor), fachwerk, klinker, platte.
export const MARKEN = {
  // Marktplatz
  DETHL57P00006G2R: {
    name: 'Rotes Rathaus, Marktplatz 1',
    col: '#9b2d2a',
    surr: true,
    frame: 0,
    roof: '#3b3e44',
    gauben: true,
    foto: 'Rotes Rathaus Suhl 2025-02-24 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G27: { name: 'Rotes Rathaus, Hinterhaus', col: '#9b2d2a', surr: true, frame: 0, roof: '#3b3e44' },
  DETHL57P00006G1v: {
    name: 'Amtsgericht, Marktplatz 2',
    col: '#eeece5',
    surr: true,
    frame: 3,
    roof: '#9e4b35',
    gauben: true,
    foto: 'Eingang vom Gebäude Marktplatz 2 mit Arbeitsgericht Suhl 2025-02-24 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G1P: {
    name: 'Adler-Apotheke, Marktplatz 4',
    col: '#e2a9a2',
    surr: true,
    frame: 0,
    roof: '#a24a34',
    gauben: true,
    foto: 'Blick über Marktplatz Suhl zum Gebäude Nr. 4 mit Adler-Apotheke 2025-02-24 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G2D: { name: 'Marktplatz 5', col: '#efeee9', frame: 0, roof: '#9e4b35' },
  DETHL57P00006G1b: {
    name: 'Marktplatz 6',
    col: '#e8dbae',
    frame: 0,
    roof: '#a24a34',
    foto: 'Gebäude Marktplatz 6 Suhl 2025-10-18 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G1a: {
    name: 'Marktplatz 10 (Blumenhaus Lauterbach)',
    mat: 'schiefer_og',
    col: '#d6c39b',
    frame: 0,
    foto: 'Eckgebäude Marktplatz 10 Suhl mit Blumenhaus Lauterbach 2025-02-24 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G19: {
    name: 'Geschäftshaus Marktplatz 13',
    col: '#efeee9',
    frame: 0,
    roof: '#a9503a',
    foto: 'Marktplatz Suhl mit Springbrunnen Waffenschmied 2025-02-24 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G17: { name: 'Geschäftshaus Marktplatz 13', col: '#efeee9', frame: 0, balk: false },
  // Steinweg
  DETHL57P00006G22: {
    name: 'Steinweg 13',
    col: '#e5cd62',
    frame: 0,
    gauben: true,
    foto: 'Gebäude Steinweg 13 Suhl Bild 1 2025-04-28 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G2e: { name: 'Steinweg 1', col: '#d3d3cf', frame: 0 },
  DETHL57P00006G2u: {
    name: 'Einkaufszentrum Am Steinweg',
    col: '#efefec',
    frame: 3,
    balk: false,
    foto: 'Einkaufszentrum Am Steinweg Suhl mit dem Dianabrunnen davor 2023-04-07 (Strubbl, CC BY-SA 4.0)',
  },
  // churches
  DETHL57P00006FVy: {
    name: 'Kreuzkirche',
    col: '#e2b957',
    surr: true,
    frame: 0,
    roof: '#a6492f',
    foto: 'Kreuzkirche von der Schleusinger Straße Suhl Bild 4 2025-10-18 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G2Q: {
    name: 'Hauptkirche St. Marien',
    col: '#e4bd5d',
    surr: true,
    frame: 0,
    roof: '#a4472f',
    foto: 'Lutherbuche vor der Hauptkirche St. Marien Bild 1 2025-02-24 (Strubbl, CC BY-SA 4.0)',
  },
  // Congress Centrum, its towers
  DETHL57P00006G0F: {
    name: 'Congress Centrum Suhl',
    col: '#e1c88d',
    frame: 3,
    balk: false,
    foto: 'CCS Suhl 2024-08-22 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G0Q: { name: 'Congress Centrum Suhl', col: '#e1c88d', frame: 3, balk: false },
  DETHL57P00006G0l: {
    name: 'Hotelturm am CCS',
    col: '#e9e9e6',
    frame: 3,
    balk: false,
    foto: 'Friedrich-König-Straße 1 Suhl mit City Hotel am CCS 2023-12-27 (Strubbl, CC BY-SA 4.0)',
  },
  DETHL57P00006G0c: {
    name: 'Hochhaus Friedrich-König-Straße 9',
    col: '#b4463b',
    frame: 0,
    foto: 'CCS Suhl 2024-08-22 (Strubbl, CC BY-SA 4.0)',
  },
};
// a material word → the style of the facade program (lazy/suhl/bau/haus.js ST)
export const MARK_ST = { putz: 0, platte: 1, schiefer: 2, schiefer_og: 3, fachwerk: 5, klinker: 0 };
