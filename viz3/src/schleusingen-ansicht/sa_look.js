// ===================== feat/schleusingen-ansicht: a facade record → the town's look of a building – pure (SALOOK) =====================
// The records of viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json (read off private views from the street; checked
// by tools/schleusingen-ansicht/check.py) turned into what welt/schleusingen.js draws: the style codes of world/village.js's facade shader
// (0 plaster – brick too, in its colour –, 1 modern, 2 slate, 3 slate upper floors, 4 slate gable, 5 half-timbering, 6 half-timbered upper
// floors, 8 boards, 10 sheet-metal hall, 11 shed), the wall colour linear × 0.82 like the town's palette, the timber, frames, shutters, the slate's tone
// (3 = shingles in the wall's own colour), the type (0 house, 1 hall, 2 shed), the roof's kind and colour (sRGB 0…1, the town makes it
// linear). No imports: unit-tested in node (viz3/test/unit/schleusingen_ansicht.test.mjs).
export const SALOOK = (() => {
  const ST = {
    PLASTER: 0,
    MODERN: 1,
    SLATE: 2,
    SLATE_UP: 3,
    SLATE_GABLE: 4,
    FW: 5,
    FW_UP: 6,
    BARN_FULL: 8,
    HALL: 10,
    SHED: 11,
  };
  const TIMBER = { braun: 0, rot: 1, schwarz: 2 }, // world/village.js timberCol: dark brown, ox-blood red, black
    FRAME = { weiss: 0, braun: 1, gruen: 2, grau: 3, blau: 0 }, // frameCol: white, brown, green, grey (no blue: white)
    SHUT = { gruen: 0, braun: 1, grau: 2 }, // shutCol
    TONE = { dunkel: 0, hell: 1, mittel: 2 }, // slateCol: blue-black, silver-grey, mid grey
    ROOF = { ziegel: 0, faserzement: 1, blech: 2, schiefer: 3, flach: 4 }, // world/village.js roof kinds
    TYP = { halle: 1, autohaus: 1, garage: 1, schuppen: 2, scheune: 2 };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  /** '#rrggbb' → [r, g, b] sRGB 0…1, or null */
  function hexSrgb(h) {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(h || ''));
    return m ? [1, 2, 3].map(k => parseInt(m[k], 16) / 255) : null;
  }
  /** '#rrggbb' → linear × k (the town's palette: linC(c, 0.82)), or null */
  function hexLin(h, k = 0.82) {
    const c = hexSrgb(h);
    return c ? c.map(v => lin(v) * k) : null;
  }
  /** the town's look of a building from its record r; st: what styleOf gave (kept where the record says nothing) */
  function look(r, st) {
    const o = Object.assign({}, st || {}),
      col = hexLin(r.wand),
      eg = r.eg ? hexLin(r.eg.farbe) : null,
      m = r.material;
    if (col) o.col = col;
    o.orn = false;
    o.shutters = !!r.laeden;
    if (r.laeden) o.shut = SHUT[r.rahmen] !== undefined ? SHUT[r.rahmen] : 0;
    o.frame = FRAME[r.rahmen] !== undefined ? FRAME[r.rahmen] : 0;
    o.slate = 0;
    if (m === 'putz' || m === 'stein' || m === 'fachwerk_giebel') o.style = ST.PLASTER;
    else if (m === 'putz_modern' || m === 'glas') o.style = ST.MODERN;
    else if (m === 'schiefer' || m === 'verkleidung') {
      o.style = ST.SLATE;
      o.slate = 3; // the shingles in the colour read off the view
    } else if (m === 'schiefer_og') {
      o.style = ST.SLATE_UP;
      o.slate = TONE[r.schiefer] !== undefined ? TONE[r.schiefer] : 0;
      if (eg) o.col = eg; // the ground floor in its own colour, the slate above in its tone
    } else if (m === 'schiefer_giebel') {
      o.style = ST.SLATE_GABLE;
      o.slate = TONE[r.schiefer] !== undefined ? TONE[r.schiefer] : 0;
    } else if (m === 'fachwerk') o.style = ST.FW;
    else if (m === 'fachwerk_og') {
      o.style = ST.FW_UP;
      if (eg) o.col = eg;
    } else if (m === 'klinker') o.style = ST.PLASTER;
    // brick: plaster in the brick's colour – style 9 falls into the facade shader's barn branch (6.5 < st < 9.5) and would be drawn
    // as boards (Suhl does the same, docs/PARALLEL.md 13.11.)
    else if (m === 'bretter') o.style = r.art === 'scheune' ? ST.BARN_FULL : ST.SHED;
    else if (m === 'blech') o.style = ST.HALL;
    if (r.fachwerk && TIMBER[r.fachwerk] !== undefined) o.timber = TIMBER[r.fachwerk];
    o.typ = TYP[r.art] !== undefined ? TYP[r.art] : 0;
    if (r.art === 'garage' && o.style === ST.PLASTER) o.typ = 1; // a garage door, not a house door
    if (o.style === ST.HALL) o.sp = 4.5;
    else if (o.style === ST.SHED) o.sp = 3.2;
    else if (o.style === ST.MODERN) o.sp = Math.max(3.1, Math.min(3.5, o.sp || 3.3));
    else o.sp = Math.max(2.4, Math.min(3.0, o.sp || 2.7));
    return o;
  }
  /** the roof: { rk, rc } – rc sRGB 0…1 (building() makes it linear); a flat roof only where the data's roof is flat (else fibre cement) */
  function roof(r, flat) {
    const d = r.dach || {};
    let rk = ROOF[d.material];
    if (rk === undefined) return null;
    if (rk === 4 && !flat) rk = 1;
    const rc = hexSrgb(d.farbe);
    return rc ? { rk, rc } : null;
  }
  /** the records by index i, with their centroid to check against the town's data */
  function index(doc) {
    const M = new Map();
    for (const r of (doc && doc.gebaeude) || []) if (Number.isInteger(r.i)) M.set(r.i, r);
    return M;
  }
  /** a record belongs to a building only if the building's centroid is where the record says (the data may have changed) */
  const matches = (r, cx, cy, tol = 1.0) => Math.hypot(r.x - cx, r.y - cy) <= tol;
  return { ST, TIMBER, FRAME, TONE, ROOF, hexSrgb, hexLin, look, roof, index, matches };
})();
if (typeof window !== 'undefined') window.SALOOK = SALOOK; // the tests read it in the page
