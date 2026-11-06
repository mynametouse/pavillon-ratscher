// ===================== feat/welt-dinge 0: when a parking place has a car – pure, no browser (DZEIT) =====================
// The share of the places of a kind (a private drive or yard 'hof', the kerb of a village street 'strasse', a works yard 'betrieb', the
// kerb of a town street 'stadt') that has a car, over the hours of a workday, a Saturday and a Sunday; whether one place has its car at a
// game time: its habit (fixed – the same drives empty every morning) and the day's chance against that share. Unit tests:
// viz3/test/unit/dinge.test.mjs.
export const DZEIT = (() => {
  // [hour, share] keyframes, linear between (a village in Thuringia: most commute by car, out 6–8 h, back 15:30–18:30)
  const CURVES = {
    hof: {
      werktag: [
        [0, 0.95],
        [5.5, 0.95],
        [6.5, 0.8],
        [8, 0.52],
        [12, 0.5],
        [13, 0.55],
        [15, 0.55],
        [17, 0.78],
        [18.5, 0.9],
        [20, 0.86],
        [22, 0.93],
        [24, 0.95],
      ],
      samstag: [
        [0, 0.93],
        [8, 0.92],
        [9.5, 0.68],
        [12, 0.66],
        [14, 0.78],
        [17, 0.75],
        [19, 0.78],
        [22, 0.9],
        [24, 0.93],
      ],
      sonntag: [
        [0, 0.92],
        [9, 0.92],
        [11, 0.82],
        [14, 0.68],
        [17, 0.72],
        [19, 0.88],
        [24, 0.93],
      ],
    },
    strasse: {
      werktag: [
        [0, 0.88],
        [6, 0.86],
        [8, 0.48],
        [16, 0.45],
        [18.5, 0.78],
        [24, 0.88],
      ],
      samstag: [
        [0, 0.86],
        [9, 0.8],
        [11, 0.6],
        [16, 0.7],
        [20, 0.8],
        [24, 0.86],
      ],
      sonntag: [
        [0, 0.86],
        [12, 0.8],
        [14, 0.9],
        [18, 0.85],
        [24, 0.86],
      ],
    },
    // car parks of OpenStreetMap by what they belong to (empty in the photo of a Sunday morning, filled by the hour): a supermarket or
    // shop – shopping hours Mon–Sat, Saturday morning full, Sunday closed; a church – the Sunday service; a school or kindergarten –
    // teachers and parents on schooldays; a doctor, office, bank, town hall – office hours; an inn – lunch and evening; sports – evenings
    // and weekends; a cemetery – visits by day, more on Sundays; any other public car park – a little by day
    laden: {
      werktag: [
        [0, 0.03],
        [7, 0.04],
        [8, 0.35],
        [10, 0.55],
        [12, 0.5],
        [15, 0.55],
        [17, 0.8],
        [19, 0.6],
        [20, 0.3],
        [21, 0.05],
        [24, 0.03],
      ],
      samstag: [
        [0, 0.03],
        [7, 0.05],
        [8, 0.5],
        [10, 0.9],
        [12, 0.85],
        [15, 0.6],
        [18, 0.5],
        [20, 0.2],
        [21, 0.04],
        [24, 0.03],
      ],
      sonntag: [
        [0, 0.03],
        [24, 0.03],
      ],
    },
    kirche: {
      werktag: [
        [0, 0.03],
        [24, 0.03],
      ],
      samstag: [
        [0, 0.03],
        [24, 0.03],
      ],
      sonntag: [
        [0, 0.03],
        [9, 0.05],
        [9.6, 0.75],
        [11.2, 0.75],
        [11.8, 0.08],
        [24, 0.03],
      ],
    },
    schule: {
      werktag: [
        [0, 0.02],
        [7, 0.1],
        [7.6, 0.8],
        [13, 0.75],
        [14, 0.4],
        [16, 0.15],
        [17, 0.03],
        [24, 0.02],
      ],
      samstag: [
        [0, 0.02],
        [24, 0.02],
      ],
      sonntag: [
        [0, 0.02],
        [24, 0.02],
      ],
    },
    dienst: {
      werktag: [
        [0, 0.04],
        [7, 0.08],
        [8, 0.65],
        [12, 0.7],
        [13, 0.4],
        [14, 0.55],
        [17, 0.45],
        [18, 0.08],
        [24, 0.04],
      ],
      samstag: [
        [0, 0.04],
        [9, 0.2],
        [12, 0.2],
        [13, 0.04],
        [24, 0.04],
      ],
      sonntag: [
        [0, 0.03],
        [24, 0.03],
      ],
    },
    gaststaette: {
      werktag: [
        [0, 0.05],
        [11, 0.06],
        [12, 0.4],
        [14, 0.4],
        [15, 0.1],
        [17.5, 0.15],
        [19, 0.6],
        [22, 0.55],
        [23, 0.15],
        [24, 0.05],
      ],
      samstag: [
        [0, 0.08],
        [11, 0.06],
        [12, 0.45],
        [14, 0.4],
        [15, 0.15],
        [18, 0.4],
        [19.5, 0.75],
        [22.5, 0.6],
        [24, 0.1],
      ],
      sonntag: [
        [0, 0.08],
        [10.5, 0.08],
        [11.5, 0.65],
        [14, 0.6],
        [15, 0.3],
        [18, 0.3],
        [21, 0.1],
        [24, 0.05],
      ],
    },
    sport: {
      werktag: [
        [0, 0.03],
        [16, 0.05],
        [17, 0.55],
        [20.5, 0.55],
        [21.5, 0.1],
        [24, 0.03],
      ],
      samstag: [
        [0, 0.03],
        [9, 0.45],
        [17, 0.45],
        [18, 0.1],
        [24, 0.03],
      ],
      sonntag: [
        [0, 0.03],
        [9.5, 0.4],
        [13, 0.4],
        [14, 0.1],
        [24, 0.03],
      ],
    },
    friedhof: {
      werktag: [
        [0, 0.02],
        [9, 0.12],
        [17, 0.12],
        [18, 0.02],
        [24, 0.02],
      ],
      samstag: [
        [0, 0.02],
        [9, 0.18],
        [17, 0.18],
        [18, 0.02],
        [24, 0.02],
      ],
      sonntag: [
        [0, 0.02],
        [9.5, 0.35],
        [12, 0.35],
        [14, 0.2],
        [17, 0.2],
        [18, 0.02],
        [24, 0.02],
      ],
    },
    allgemein: {
      werktag: [
        [0, 0.15],
        [7, 0.2],
        [9, 0.5],
        [17, 0.5],
        [19, 0.3],
        [24, 0.15],
      ],
      samstag: [
        [0, 0.15],
        [9, 0.4],
        [16, 0.4],
        [19, 0.25],
        [24, 0.15],
      ],
      sonntag: [
        [0, 0.15],
        [10, 0.3],
        [17, 0.3],
        [20, 0.18],
        [24, 0.15],
      ],
    },
    // the kerbs of a town (Schleusingen): residents at night, visitors and shoppers by day – hardly ever empty
    stadt: {
      werktag: [
        [0, 0.86],
        [6, 0.84],
        [8, 0.68],
        [10, 0.78],
        [17, 0.8],
        [19, 0.84],
        [24, 0.86],
      ],
      samstag: [
        [0, 0.86],
        [8, 0.8],
        [10, 0.85],
        [16, 0.8],
        [24, 0.86],
      ],
      sonntag: [
        [0, 0.86],
        [24, 0.86],
      ],
    },
    betrieb: {
      werktag: [
        [0, 0.15],
        [5.5, 0.15],
        [7, 0.92],
        [15.5, 0.9],
        [17.5, 0.25],
        [24, 0.15],
      ],
      samstag: [
        [0, 0.15],
        [7, 0.15],
        [8, 0.4],
        [12, 0.4],
        [13, 0.15],
        [24, 0.15],
      ],
      sonntag: [
        [0, 0.12],
        [24, 0.12],
      ],
    },
  };
  function curve(K, h) {
    for (let i = 1; i < K.length; i++)
      if (h <= K[i][0]) {
        const [h0, v0] = K[i - 1],
          [h1, v1] = K[i];
        return v0 + ((v1 - v0) * (h - h0)) / Math.max(1e-6, h1 - h0);
      }
    return K[K.length - 1][1];
  }
  const frac = v => v - Math.floor(v),
    hash = (a, b) => frac(Math.sin(a * 12.9898 + b * 78.233 + 0.5) * 43758.5453),
    dayType = wd => (wd === 0 ? 'sonntag' : wd === 6 ? 'samstag' : 'werktag');
  // the share at game time t (minutes since day 1, 0:00) on weekday wd (0 Sunday … 6 Saturday)
  const share = (kind, t, wd) => {
    const m = ((t % 1440) + 1440) % 1440;
    return curve((CURVES[kind] || CURVES.hof)[dayType(wd)], m / 60);
  };
  // place i (habit 0…1) has its car at t: r = 0.65 habit + 0.35 chance of the day, made uniform again (the distribution function of the
  // sum of two uniform parts) so that the share of the places with a car is the curve's share
  const A = 0.65,
    B = 0.35,
    uni = r => (r <= B ? (r * r) / (2 * A * B) : r <= A ? (r - B / 2) / A : 1 - ((1 - r) * (1 - r)) / (2 * A * B));
  const want = (i, habit, kind, t, wd) => uni(A * habit + B * hash(i + 17, Math.floor(t / 1440))) < share(kind, t, wd);
  return { CURVES, curve, share, want, hash, uni, dayType, KINDS: Object.keys(CURVES) };
})();
