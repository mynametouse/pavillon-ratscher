// ===================== feat/dorfkern: the centre of Ratscher as Falko filmed it (pan of 10.04.2023, photo of Anger 15) – data =====================
// The houses around the Anger seen in the video, each with its look as it really is (world/village.js applies it instead of the hash) and,
// where the surface model's fit was wrong, its heights or a new gable roof; the open space of the centre (world/dorfkern.js): the well,
// benches, bin, the limes, the hedge, picnic tables, poles and lines, fences, lamps. Positions in site metres (x east, y north), heights above
// the building's foot, colours sRGB 0…1. How it was measured (camera fitted to the pan) and the table with sources: docs/features/dorfkern.md.
// Keys of a house: adr (OSM address), st (style name of VILLAGE.ST), col (plaster or shingle colour), slate (0 blue-black, 1 silver-grey,
// 2 mid grey, 3 coloured shingles in col), orn (white diamond band), board (gable in vertical boards: 1 from the eave, 2 from 1.5 m above it,
// 3 only the top, 4 m above it), surr (light window surrounds), timber/frame/door (palette indices: frame 0 white, 1 brown, 2 green, 3 grey;
// door 1 brown, 6 light blue), doorAz/doorU (the door on the facade facing doorAz, at doorU of its length), raised (high plinth),
// roof (tile colour), chim/chimAt (chimneys: count, places along the ridge), h ([eave, ridge] as measured: walls and fitted roof remapped),
// house (a dwelling the data took for an outbuilding), roof3 ({ az ridge azimuth, e eave or [left, right] of the ridge, r ridge, at its place
// across 0…1 }: walls and roof made anew), cut/front/back (the footprint cut in two along the line `cut`: the part holding `front` is the house,
// the other is `back`, with its own look and roof3), t (video seconds where it is seen).
// ?dorfkern=0: the centre as before (hash looks, fitted roofs, the old places) – for comparisons and the frame-time test (test/dorfkern.py)
const OFF = typeof location !== 'undefined' && /[?&]dorfkern=0(&|$)/.test(location.search || '');
const DATA = {
  // the camera of the pan: standing on the south edge of the Anger street by the bus stop, eye 1.6 m, 58.6° wide (iPhone SE, 1080p)
  cam: { x: 248.8, y: -107.1, eye: 1.6, h0: 158.7, hfov: 57.2, drift: 10.7 },
  houses: {
    215: { adr: 'Ratschner Anger 24', h: [3.8, 9.7], t: '12–19' }, // the old school: style fixed in village.js, eave and ridge as measured
    250: {
      adr: 'Ratschner Anger 15',
      t: '0–4, Foto',
      st: 'SLATE',
      slate: 0,
      orn: true,
      board: 1,
      surr: true,
      frame: 0,
      door: 1,
      doorAz: 287,
      doorU: 0.62,
      raised: true,
      roof: [0.5, 0.23, 0.18],
      chim: 2,
      chimAt: [0.45, 0.8],
      cut: [
        [250, -143],
        [275, -150.5],
      ],
      front: [264, -133],
      roof3: { az: 17, e: 5.1, r: 9.8 },
      back: { st: 'BARN', col: [0.5, 0.42, 0.34], roof3: { az: 17, e: 4.0, r: 7.6 } },
    },
    247: {
      adr: 'Ratschner Anger 17',
      t: '0–4, Foto',
      st: 'SLATE_UP',
      col: [0.97, 0.63, 0.48],
      slate: 0,
      frame: 0,
      house: true,
      roof: [0.48, 0.2, 0.16],
      chim: 1,
      h: [4.7, 7.4],
    },
    245: {
      adr: 'Ratschner Anger 19',
      t: '0, 22–24',
      st: 'PLASTER',
      col: [0.8, 0.9, 0.7],
      frame: 1,
      roof: [0.5, 0.22, 0.17],
      chim: 0,
      cut: [
        [228, -138.2],
        [252, -145.1],
      ],
      front: [242, -132],
      roof3: { az: 16, e: [4.6, 2.9], r: 8.1, at: 0.45 },
      back: { st: 'BARN', col: [0.45, 0.36, 0.28], roof3: { az: 16, e: 3.5, r: 6.5 } },
    },
    242: {
      adr: 'Ratschner Anger 21',
      t: '20–24',
      st: 'SLATE',
      slate: 3,
      col: [0.88, 0.7, 0.34],
      orn: true,
      frame: 1,
      roof: [0.38, 0.2, 0.15],
      chim: 1,
      h: [4.3, 8.8],
    },
    240: {
      adr: 'Ratschner Anger 23',
      t: '20–24',
      st: 'SLATE',
      slate: 2,
      orn: true,
      frame: 1,
      door: 1,
      doorAz: 14,
      doorU: 0.55,
      roof: [0.42, 0.2, 0.17],
      chim: 1,
      h: [6.3, 10.8],
    },
    216: {
      adr: 'Ratschner Anger 26',
      t: '19–21',
      st: 'PLASTER',
      col: [0.9, 0.74, 0.42],
      frame: 1,
      roof: [0.5, 0.24, 0.19],
    },
    213: {
      adr: 'Ratschner Anger 20',
      t: '4–10',
      st: 'PLASTER',
      col: [0.93, 0.92, 0.84],
      frame: 2,
      board: 3,
      raised: true,
      roof: [0.72, 0.36, 0.25],
      chim: 0,
      cut: [
        [265, -94.4],
        [285, -101.3],
      ],
      front: [271, -104],
      roof3: { az: 112, e: [2.6, 4.8], r: 8.7, at: 0.5 },
      back: { st: 'BARN', col: [0.8, 0.78, 0.72], roof3: { az: 19, e: 3.4, r: 6.6 } },
    },
    212: {
      adr: 'Ratschner Anger 18',
      t: '4–9',
      st: 'SLATE',
      slate: 0,
      surr: true,
      frame: 0,
      door: 6,
      doorAz: 202,
      doorU: 0.35,
      roof: [0.72, 0.36, 0.25],
      chim: 1,
      cut: [
        [270, -96.5],
        [295, -105.2],
      ],
      front: [280, -107],
      roof3: { az: 112, e: 4.8, r: 8.7 },
      back: { st: 'BARN', col: [0.5, 0.42, 0.34], roof3: { az: 19, e: 3.4, r: 6.6 } },
    },
    211: {
      adr: 'Ratschner Anger 16',
      t: '4–8',
      st: 'SLATE',
      slate: 0,
      frame: 0,
      roof: [0.66, 0.3, 0.22],
      chim: 1,
      cut: [
        [285, -98.1],
        [305, -103.4],
      ],
      front: [292, -112],
      roof3: { az: 105, e: 4.9, r: 9.2 },
      back: { st: 'BARN', col: [0.47, 0.4, 0.33], roof3: { az: 15, e: 3.5, r: 6.8 } },
    },
    208: {
      adr: 'Ratschner Anger 14',
      t: '4–8',
      st: 'SLATE',
      slate: 0,
      frame: 0,
      house: true,
      roof: [0.64, 0.29, 0.21],
    },
    207: {
      adr: 'Ratschner Anger 12',
      t: '5–8',
      st: 'SLATE',
      slate: 0,
      frame: 0,
      house: true,
      roof: [0.62, 0.28, 0.21],
    },
    252: {
      adr: 'Ratschner Anger 13',
      t: '0–6',
      st: 'SLATE',
      slate: 3,
      col: [0.88, 0.86, 0.79],
      frame: 0,
      house: true,
      roof: [0.6, 0.28, 0.2],
    },
    253: { adr: 'Ratschner Anger 11', t: '3–6', st: 'SLATE', slate: 0, orn: true, frame: 0, roof: [0.55, 0.25, 0.19] },
    214: { t: '11–18', st: 'BRICK', col: [0.62, 0.3, 0.22], frame: 0, roof: [0.62, 0.27, 0.2] }, // the low red-brick building north of the school
  },
  // the open space (world/dorfkern.js, world/village_props.js): places from rays of the video frames on the ground, OSM and the orthophoto
  open: {
    // the well in front of Anger 15 (OSM man_made=water_well at 266.6, −121.1; video 0–4 s): octagonal sandstone wall, steps to the south-south-east
    well: { c: [266.0, -121.4], az: 343, size: [4.8, 3.6], chamfer: 0.8, h: 0.78 },
    benches: [
      [262.0, -118.6, 300, 1.8, [0.42, 0.27, 0.17]], // brown (x, y, faces az, length, colour)
      [260.3, -118.0, 300, 1.8, [0.17, 0.48, 0.22]], // green
    ],
    bins: [
      [263.2, -120.9, [0.2, 0.45, 0.25]], // the green bin at the well
      [235.8, -113.1, [0.45, 0.45, 0.43]], // on the green
    ],
    // the two limes by the well: the measured crowns (from) moved to the trunks the video shows (at), height, crown width factor
    limes: [
      { from: [260.2, -116.4], at: [257.9, -119.4], h: 13, w: 1.2 },
      { from: [255.1, -119.0], at: [253.6, -117.2], h: 9.5 },
    ],
    linde: [217.0, -109.0], // the Dorflinde with its ring of benches: bearing 265.5° in the video (was 216.5, −106.5)
    hedges: [
      {
        p: [
          [243.5, -110.8],
          [237.0, -106.2],
        ],
      },
      {
        p: [
          [239.5, -117.8],
          [223.0, -114.5],
        ],
      },
    ],
    picnic: [[231.5, -113.0, 290]],
    logs: [[236.0, -116.2, 290, 4.0]],
    // the picket fence along the meadow behind the bus stop (video 8–12 s, 16–18 s)
    fences: [
      {
        p: [
          [246.6, -98.2],
          [251.5, -99.1],
          [257.2, -101.5],
          [265.5, -104.6],
        ],
      },
    ],
    poles: [
      [209.5, -87.0],
      [243.2, -97.6],
      [277.0, -109.6],
    ], // concrete power poles on the north side of the street, the overhead line between them
    vending: [245.4, -99.7, 200],
    whitebox: [261.0, -85.4, 119, 6.0, 2.4, 2.3], // x, y, azimuth of the long side, length, depth, height
    porches: [[240, 1.9, 1.1, 2.6]], // building, width, depth, height of the porch roof over its door
    lamps: [
      [246.1, -99.8],
      [254.1, -126.2],
      [210.8, -124.0],
    ],
    shelter: { c: [248.8, -100.8], az: 196 }, // the school bus stop (OSM node 250.0, −100.5); open side to the road
  },
};
export const DKDATA = OFF ? { off: true, cam: DATA.cam, houses: {}, open: null } : DATA;
window.DKDATA = DKDATA;
