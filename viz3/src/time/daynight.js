// ===================== V16a: day and night after the game clock =====================
// The sun stands where it really stands over Ratscher (50.47° N, 10.78° E) at the game's date and time (NOAA formulas with refraction),
// the moon too (low-precision series of the Astronomical Almanac, phase from its elongation), and the 5000 stars to magnitude 6 and the
// Milky Way turn with the sidereal time. Between the photographed skies (day, golden hour, twilight), their image-based light and the
// baked indirect light the picture blends continuously; after sunset the twilight fades into the night sky. The pavilion's lamps switch
// on at dusk by themselves, the LED lights in the workshop when someone is in it after dark. Menu "Licht": "Tageslauf" (this) or a fixed mood.
phase(null);
const DN = (() => {
  const LAT = 50.4705, LON = 10.7801, D2R = Math.PI / 180, R2D = 180 / Math.PI, { sin, cos, asin, atan2, tan, acos } = Math;
  const LSK = 'pav-dn-v1', DAY0 = Date.UTC(2026, 5, 1) / 864e5;   // game day 1 = Monday, 1 June 2026
  const S = { e0: DAY0, active: false, mode: 'auto', cur: null, ap: null, envKey: '', giKey: '', skyKey: '', icon: '', hint: false, top: false, lampL: null, lampP: -1 };
  try { const s = JSON.parse(localStorage.getItem(LSK) || 'null'); if (s && Number.isFinite(s.e0)) S.e0 = Math.round(s.e0); if (s && s.hint) S.hint = true; } catch (e) {}
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify({ e0: S.e0, hint: S.hint })); } catch (e) {} };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // ---------------- calendar: local civil time in Germany (CET; CEST from the last Sunday in March to the last Sunday in October) ----------------
  const lastSun = (y, mo) => { const d = new Date(Date.UTC(y, mo + 1, 0)); return Date.UTC(y, mo, d.getUTCDate() - d.getUTCDay()) / 864e5; };
  function tzOf(eday, min) { const y = new Date(eday * 864e5).getUTCFullYear(), a = lastSun(y, 2), b = lastSun(y, 9);
    if (eday > a && eday < b) return 2; if (eday === a) return min >= 120 ? 2 : 1; if (eday === b) return min < 180 ? 2 : 1; return 1; }
  const edayOf = t => S.e0 + Math.floor(t / 1440);
  function jdOf(t) { const d = Math.floor(t / 1440), m = t - d * 1440, e = S.e0 + d; return e + 2440587.5 + (m - 60 * tzOf(e, m)) / 1440; }
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const ymd = e => { const d = new Date(e * 864e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() }; };
  const dateStr = (t = CLOCK.t, long) => { const q = ymd(edayOf(t)); return (long ? WDL[q.wd] : WD[q.wd]) + ', ' + q.d + '. ' + MON[q.m] + (long ? ' ' + q.y : ''); };
  const dateShort = (t = CLOCK.t) => { const q = ymd(edayOf(t)); return WD[q.wd] + ' ' + q.d + '.' + (q.m + 1) + '.'; };
  // ---------------- sun, moon, sidereal time ----------------
  function sunAt(jd) { const T = (jd - 2451545) / 36525, L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * D2R;
    const C = sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sin(2 * M) * (0.019993 - 0.000101 * T) + sin(3 * M) * 0.000289, om = (125.04 - 1934.136 * T) * D2R;
    const lam = (L0 + C - 0.00569 - 0.00478 * sin(om)) * D2R, eps = (23.439291 - 0.0130042 * T + 0.00256 * cos(om)) * D2R;
    return { ra: atan2(cos(eps) * sin(lam), cos(lam)), dec: asin(sin(eps) * sin(lam)), lam }; }
  function moonAt(jd) { const T = (jd - 2451545) / 36525, d = x => x * D2R;
    const lam = 218.32 + 481267.881 * T + 6.29 * sin(d(135.0 + 477198.87 * T)) - 1.27 * sin(d(259.3 - 413335.36 * T)) + 0.66 * sin(d(235.7 + 890534.22 * T)) + 0.21 * sin(d(269.9 + 954397.74 * T)) - 0.19 * sin(d(357.5 + 35999.05 * T)) - 0.11 * sin(d(186.5 + 966404.03 * T));
    const bet = 5.13 * sin(d(93.3 + 483202.02 * T)) + 0.28 * sin(d(228.2 + 960400.89 * T)) - 0.28 * sin(d(318.3 + 6003.15 * T)) - 0.17 * sin(d(217.6 - 407332.21 * T));
    const par = 0.9508 + 0.0518 * cos(d(135.0 + 477198.87 * T)) + 0.0095 * cos(d(259.3 - 413335.36 * T)) + 0.0078 * cos(d(235.7 + 890534.22 * T)) + 0.0028 * cos(d(269.9 + 954397.74 * T));
    const eps = d(23.439 - 0.013 * T), l = d(lam), b = d(bet), x = cos(b) * cos(l), y = cos(eps) * cos(b) * sin(l) - sin(eps) * sin(b), z = sin(eps) * cos(b) * sin(l) + cos(eps) * sin(b);
    return { ra: atan2(y, x), dec: asin(z), lam: l, bet: b, par }; }
  const gmst = jd => { const d = jd - 2451545, T = d / 36525; return ((280.46061837 + 360.98564736629 * d + T * T * (0.000387933 - T / 38710000)) % 360 + 360) % 360; };
  function horiz(ra, dec, lst) { const H = lst * D2R - ra, la = LAT * D2R, el = asin(sin(la) * sin(dec) + cos(la) * cos(dec) * cos(H));
    return { az: ((atan2(sin(H), cos(H) * sin(la) - tan(dec) * cos(la)) * R2D + 180) % 360 + 360) % 360, el: el * R2D }; }
  // atmospheric refraction (Sæmundsson, true → apparent), tapered out below the horizon so the apparent height runs on without a jump
  const refr = el => { const h = Math.max(el, -1), r = 1.02 / tan((h + 10.3 / (h + 5.11)) * D2R) / 60; return el >= -1 ? r : r * Math.max(0, 1 + (el + 1) / 3); };
  function skyAt(jd) { const lst = (gmst(jd) + LON) % 360, so = sunAt(jd), mo = moonAt(jd), sh = horiz(so.ra, so.dec, lst), mh = horiz(mo.ra, mo.dec, lst);
    mh.el -= mo.par * cos(mh.el * D2R);   // topocentric: seen from the earth's surface the moon stands lower by its parallax
    const psi = acos(clamp(cos(mo.bet) * cos(mo.lam - so.lam), -1, 1)), illum = (1 - cos(psi)) / 2, waxing = ((((mo.lam - so.lam) * R2D) % 360) + 360) % 360 < 180;
    return { jd, lst, sunAz: sh.az, sunEl: sh.el + refr(sh.el), moonAz: mh.az, moonEl: mh.el + refr(mh.el), illum, waxing }; }
  // sunrise/sunset and moonrise/moonset on the game day of t (local minutes, null if none)
  const RSC = {};
  function riseSet(t, body) { const ck = S.e0 + ':' + Math.floor(t / 1440) + body; if (RSC[ck]) return RSC[ck]; const r = riseSet0(t, body); RSC[ck] = r; return r; }
  function riseSet0(t, body) { const d0 = Math.floor(t / 1440) * 1440, f = m => { const s = skyAt(jdOf(d0 + m)); return body === 'moon' ? s.moonEl + 0.27 : s.sunEl + 0.27; };
    let up = null, down = null, prev = f(0); for (let m = 6; m <= 1440; m += 6) { const v = f(m); if ((prev < 0) !== (v < 0)) { let a = m - 6, b = m; for (let i = 0; i < 7; i++) { const c = (a + b) / 2; if ((f(a) < 0) === (f(c) < 0)) a = c; else b = c; } if (v > 0 && up == null) up = (a + b) / 2; if (v < 0 && down == null) down = (a + b) / 2; } prev = v; }
    return { up, down }; }
  const hmOf = m => m == null ? '–' : Math.floor(m / 60) + ':' + String(Math.floor(m % 60)).padStart(2, '0');
  // world direction (three: x east, y up, z south) from azimuth/elevation
  const dirAz = (az, el, out) => { const a = az * D2R, e = el * D2R; return (out || new THREE.Vector3()).set(sin(a) * cos(e), sin(e), -cos(a) * cos(e)); };
  // rotation equatorial (x → RA 0, z → celestial pole) → world, for the local sidereal time
  const _m = new THREE.Vector3(), _w = new THREE.Vector3(), _p = new THREE.Vector3(), _c0 = new THREE.Vector3(), _c1 = new THREE.Vector3();
  function eqBasis(lst, out) { const la = LAT * D2R, L = lst * D2R; _m.set(0, cos(la), sin(la)); _w.set(-1, 0, 0); _p.set(0, sin(la), -cos(la));
    _c0.copy(_m).multiplyScalar(cos(L)).addScaledVector(_w, sin(L)); _c1.copy(_m).multiplyScalar(sin(L)).addScaledVector(_w, -cos(L)); return out.makeBasis(_c0, _c1, _p); }
  // ---------------- the look at a sun elevation: anchors between photographed moods and the night ----------------
  const C = h => new THREE.Color(h), lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
  const hz = (m, k) => { const h = (window.SKYMAN || {})[m]; const q = (h && h.horizon_linear) || [0.6, 0.6, 0.7]; return lin(q[0] * k, q[1] * k, q[2] * k); };
  const MD = MODES;
  const KF = [
    { el: 35, tex: 'day', sun: 3.6, sunC: C(MD.day.sunC), hemi: 0.18, env: 1.0, exp: 1.22, expIn: 1.8, fog: hz('day', 0.9), fogD: 2.4e-5, L: MD.day.L, paper: 0, stove: C(MD.day.stove), cloudK: 0.42, gS: 1, nK: 0, tint: [1, 1, 1], gi: 1, zen: C(MD.day.zen), hor: C(MD.day.hor), glowK: 0.35, cloud: 0.5, cc: C(MD.day.cc), cs: C(MD.day.cs) },
    { el: 8, tex: 'gold', sun: 3.8, sunC: C(MD.gold.sunC), hemi: 0.16, env: 0.85, exp: 1.3, expIn: 1.15, fog: hz('gold', 0.9), fogD: 3.4e-5, L: MD.gold.L, paper: 0.55, stove: C(MD.gold.stove), cloudK: 0.18, gS: 1, nK: 0, tint: [1, 1, 1], gi: 1, zen: C(MD.gold.zen), hor: C(MD.gold.hor), glowK: 0.9, cloud: 0.45, cc: C(MD.gold.cc), cs: C(MD.gold.cs) },
    { el: 1.5, tex: 'gold', sun: 0.8, sunC: C(MD.dusk.sunC), hemi: 0.11, env: 0.78, exp: 1.42, expIn: 1.05, fog: hz('gold', 0.75), fogD: 4.2e-5, L: MD.dusk.L, paper: 1.7, stove: C(MD.dusk.stove), cloudK: 0.04, gS: 0.85, nK: 0, tint: [1, 1, 1], gi: 1, zen: C(0x52668f), hor: C(0xf0b37c), glowK: 1.2, cloud: 0.42, cc: C(0xf4b48a), cs: C(0x6e6478) },
    { el: -2.5, tex: 'dusk', sun: 0, sunC: C(MD.dusk.sunC), hemi: 0.08, env: 0.75, exp: 1.5, expIn: 1.0, fog: hz('dusk', 0.9), fogD: 5.2e-5, L: MD.dusk.L, paper: 1.7, stove: C(MD.dusk.stove), cloudK: 0, gS: 1, nK: 0, tint: [1, 1, 1], gi: 1, zen: C(MD.dusk.zen), hor: C(MD.dusk.hor), glowK: 1.3, cloud: 0.4, cc: C(MD.dusk.cc), cs: C(MD.dusk.cs) },
    { el: -7, tex: 'dusk', sun: 0, sunC: C(0x9fb4ff), hemi: 0.035, env: 0.24, exp: 1.85, expIn: 0.86, fog: lin(0.11, 0.1, 0.15), fogD: 5e-5, L: MD.dusk.L, paper: 1.7, stove: C(MD.dusk.stove), cloudK: 0, gS: 0.3, nK: 0.35, tint: [0.8, 0.9, 1.15], gi: 0.2, zen: C(0x101c3a), hor: C(0x3a3f5a), glowK: 0.6, cloud: 0.2, cc: C(0x6a6478), cs: C(0x26283a) },
    { el: -14, tex: 'dusk', sun: 0, sunC: C(0x9fb4ff), hemi: 0.012, env: 0.04, exp: 2.15, expIn: 0.74, fog: lin(0.012, 0.016, 0.026), fogD: 4e-5, L: MD.dusk.L, paper: 1.7, stove: C(MD.dusk.stove), cloudK: 0, gS: 0.014, nK: 1, tint: [0.6, 0.75, 1.3], gi: 0.025, zen: C(0x03070f), hor: C(0x0b0f18), glowK: 0, cloud: 0, cc: C(0x10121a), cs: C(0x08090e) }];
  const LOOK = { L: new Array(7).fill(0), tint: [1, 1, 1] };
  for (const k of ['sunC', 'fog', 'stove', 'zen', 'hor', 'cc', 'cs']) LOOK[k] = new THREE.Color();
  function lookAt(el) { let i = 0; while (i < KF.length - 1 && el < KF[i + 1].el) i++;
    const a = KF[i], b = KF[Math.min(i + 1, KF.length - 1)], t = a === b || el >= a.el ? 0 : sst(0, 1, (a.el - el) / (a.el - b.el)), mix = (p, q) => p + (q - p) * t;
    for (const k of ['sun', 'hemi', 'env', 'exp', 'expIn', 'fogD', 'paper', 'cloudK', 'gS', 'nK', 'gi', 'glowK', 'cloud']) LOOK[k] = mix(a[k], b[k]);
    for (const k of ['sunC', 'fog', 'stove', 'zen', 'hor', 'cc', 'cs']) LOOK[k].copy(a[k]).lerp(b[k], t);
    for (let j = 0; j < 7; j++) LOOK.L[j] = mix(a.L[j], b.L[j]); for (let j = 0; j < 3; j++) LOOK.tint[j] = mix(a.tint[j], b.tint[j]);
    if (a.tex === b.tex || t < 0.004) { LOOK.texA = a.tex; LOOK.texB = null; LOOK.kTex = 0; } else if (t > 0.996) { LOOK.texA = b.tex; LOOK.texB = null; LOOK.kTex = 0; } else { LOOK.texA = a.tex; LOOK.texB = b.tex; LOOK.kTex = t; }
    if (el < 1.5) LOOK.sun = 0.8 * sst(-0.3, 1.5, el);   // the disc sinks: the direct light dies with it
    return LOOK; }
  // ---------------- sky: two photographs blended, warped so their sun stands at the real sun's height; night gradient, Milky Way, moon ----------------
  const mwTex = new THREE.TextureLoader().load(SKYDATA.mw, t => markDirty()); mwTex.colorSpace = THREE.NoColorSpace; mwTex.wrapS = THREE.RepeatWrapping; mwTex.generateMipmaps = true;
  const SU = { tA: { value: null }, tB: { value: null }, tMW: { value: mwTex }, kB: { value: 0 }, gS: { value: 1 }, nK: { value: 0 }, mwK: { value: 0 }, sunEl: { value: 30 },
    pA: { value: new THREE.Vector4(-5, 3, 0.56, 0) }, pB: { value: new THREE.Vector4(-5, 3, 0.56, 0) }, eA: { value: new THREE.Vector2(48, 1) }, eB: { value: new THREE.Vector2(48, 1) },
    zenN: { value: new THREE.Color() }, horN: { value: new THREE.Color() }, moonDir: { value: new THREE.Vector3(0, -1, 0) }, sunD: { value: new THREE.Vector3(0, 1, 0) },
    moonK: { value: 0 }, moonR: { value: 0.32 * D2R }, glowM: { value: 0 }, pole: { value: new THREE.Vector3(0, sin(LAT * D2R), -cos(LAT * D2R)) }, uEq: { value: new THREE.Matrix3() } };
  const dnSkyMat = new THREE.ShaderMaterial({ uniforms: SU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tA, tB, tMW; uniform float kB, gS, nK, mwK, sunEl, moonK, moonR, glowM; uniform vec4 pA, pB; uniform vec2 eA, eB;
     uniform vec3 zenN, horN, moonDir, sunD, pole; uniform mat3 uEq; varying vec3 vP;
     float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
     float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
     // one photograph: p = (lo, hi, crop, azimuth offset), e = (elevation of its sun, gain); its sun is moved to the real sun's height (moderate factors only)
     vec3 photo(sampler2D t, vec3 d, vec4 p, vec2 e){ float u = fract(atan(d.z, d.x) * 0.15915494 + 0.5 - p.w); float a = asin(clamp(d.y, -1.0, 1.0)) * 57.2957795;
       if (e.x > 0.5 && a > 0.0) { float s = clamp(sunEl, e.x * 0.55, min(85.0, e.x * 1.8)); a = a < s ? a * e.x / s : e.x + (a - s) * (90.0 - e.x) / (90.0 - s); }
       float v = 1.0 - min((90.0 - a) / (180.0 * p.z), 1.0); vec3 c = texture2D(t, vec2(u, clamp(v, 0.003, 0.997))).rgb; return exp2(p.x + c * (p.y - p.x)) * e.y; }
     void main(){ vec3 d = normalize(vP); vec3 c = vec3(0.0);
       if (gS > 0.0005) { c = photo(tA, d, pA, eA); if (kB > 0.0) c = mix(c, photo(tB, d, pB, eB), kB); c *= gS;
         c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * vec3(0.72, 0.84, 1.18), nK * 0.8); }   // late twilight: the last glow turns grey-blue
       if (nK > 0.0) { float h = max(d.y, 0.0); vec3 n = mix(horN, zenN, pow(h, 0.45));
         vec3 q = uEq * d; float mw = texture2D(tMW, vec2(fract(atan(q.y, q.x) * 0.15915494), 0.5 + asin(clamp(q.z, -1.0, 1.0)) * 0.31830989)).r;
         n += vec3(0.85, 0.88, 1.0) * mw * mwK * smoothstep(-0.02, 0.3, d.y);
         if (d.y < 0.0) n = horN * 0.8;
         c += n * nK; }
       if (moonK > 0.0) { float cm = dot(d, moonDir), ang = acos(clamp(cm, -1.0, 1.0));
         c += vec3(0.62, 0.7, 0.86) * glowM * (exp(-ang * ang / 0.0004) * 2.0 + exp(-ang * ang / 0.012) * 0.35);   // halo of the moonlight in the air
         if (ang < moonR * 1.05 && d.y > -0.01) { vec3 o = (d - moonDir * cm) / moonR; float r2 = dot(o, o);
           vec3 nr = o - moonDir * sqrt(max(0.0, 1.0 - r2)); float lit = max(dot(nr, sunD), 0.0);   // lit from where the sun is: phase and the tilt of the bright limb
           vec3 e1 = normalize(cross(moonDir, pole)), e2 = cross(e1, moonDir); vec2 m = vec2(dot(o, e1), dot(o, e2));
           float alb = 0.62 + 0.38 * smoothstep(0.35, 0.65, vn(m * 2.3 + vec2(1.7, 4.2)) * 0.65 + vn(m * 5.1 + 3.0) * 0.35);   // maria
           float edge = 1.0 - smoothstep(0.86, 1.0, sqrt(r2));
           c = mix(c, c * mix(0.92, 0.25, nK) + vec3(1.0, 0.96, 0.88) * moonK * (pow(lit, 0.8) * alb + 0.012 * nK), edge); } }   // the dark part: the air in front of it still glows by day
       gl_FragColor = vec4(c, 1.0);
       #include <tonemapping_fragment>
       #include <colorspace_fragment>
     }` });
  // ---- the stars: Hipparcos to magnitude 6 (d3-celestial), points at a great distance that follow the camera and turn with the sky ----
  const STARS = (() => { const n = SKYDATA.n, raw = Uint8Array.from(atob(SKYDATA.stars), ch => ch.charCodeAt(0)), dv = new DataView(raw.buffer);
    const pos = new Float32Array(n * 3), mag = new Float32Array(n), col = new Float32Array(n * 3), cB = [[-0.3, 0.62, 0.74, 1.0], [0.0, 0.8, 0.86, 1.0], [0.4, 1.0, 0.98, 0.95], [0.8, 1.0, 0.9, 0.76], [1.2, 1.0, 0.8, 0.6], [1.8, 1.0, 0.68, 0.45]];
    for (let i = 0; i < n; i++) { const ra = dv.getUint16(i * 6, true) / 65535 * 2 * Math.PI, de = (dv.getUint16(i * 6 + 2, true) / 65535 * 180 - 90) * D2R;
      pos[i * 3] = cos(de) * cos(ra); pos[i * 3 + 1] = cos(de) * sin(ra); pos[i * 3 + 2] = sin(de); mag[i] = raw[i * 6 + 4] / 25 - 2; const bv = raw[i * 6 + 5] / 100 - 0.5;
      let j = 0; while (j < cB.length - 2 && bv > cB[j + 1][0]) j++; const a = cB[j], b = cB[j + 1], t = clamp((bv - a[0]) / (b[0] - a[0]), 0, 1); for (let k = 0; k < 3; k++) col[i * 3 + k] = a[k + 1] + (b[k + 1] - a[k + 1]) * t; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    const U = { uK: { value: 0 }, uLim: { value: 6 }, uPx: { value: 1 } };
    const m = new THREE.ShaderMaterial({ uniforms: U, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: false,
      vertexShader: `attribute float aMag; attribute vec3 aCol; uniform float uK, uLim, uPx; varying vec3 vC; varying float vA;
        void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vec3 wd = normalize(mat3(modelMatrix) * position); gl_Position = projectionMatrix * viewMatrix * wp;
          float f = pow(10.0, -0.4 * (aMag - 1.0)), ext = smoothstep(-0.01, 0.16, wd.y) * (0.45 + 0.55 * smoothstep(0.05, 0.4, wd.y));   // dimmer towards the horizon
          vA = uK * smoothstep(uLim + 0.25, uLim - 0.6, aMag) * ext * clamp(0.22 + f * 0.9, 0.22, 1.0); vC = aCol * (1.0 + min(f, 6.0) * 0.5);
          gl_PointSize = uPx * clamp(1.35 + 1.0 * sqrt(f), 1.35, 4.2); if (vA < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float a = vA * (1.0 - smoothstep(0.18, 0.5, length(q)));
          if (a < 0.002) discard; gl_FragColor = vec4(vC * 0.9, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.matrixAutoUpdate = false; pts.renderOrder = -9; pts.visible = false; pts.userData.noMerge = true; scene.add(pts);
    const rot = new THREE.Matrix4(), sc = new THREE.Matrix4().makeScale(8000, 8000, 8000);
    pts.onBeforeRender = (r, s, c) => { pts.matrix.copy(rot).multiply(sc).setPosition(c.position); pts.matrixWorld.copy(pts.matrix); U.uPx.value = r.getPixelRatio(); };
    return { pts, U, rot }; })();
  // ---------------- image-based light: the two prefiltered environment maps (same layout) mixed into a third one ----------------
  const ENVB = (() => { const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene(); let rt = null;
    const mat = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, tB: { value: null }, k: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) } }, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tA, tB; uniform float k; uniform vec3 tint;
        void main(){ ivec2 p = ivec2(gl_FragCoord.xy); vec3 a = texelFetch(tA, p, 0).rgb, b = texelFetch(tB, p, 0).rgb; gl_FragColor = vec4(mix(a, b, k) * tint, 1.0); }` });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false; sc.add(q);
    function blend(A, B, k, tint) { const W = A.image.width, H = A.image.height;
      if (!rt || rt.width !== W || rt.height !== H) { if (rt) rt.dispose(); rt = new THREE.WebGLRenderTarget(W, H, { magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false, type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false });
        rt.texture.mapping = THREE.CubeUVReflectionMapping; rt.texture.name = 'PMREM.cubeUv'; }
      const u = mat.uniforms; u.tA.value = A; u.tB.value = B || A; u.k.value = B ? k : 0; u.tint.value.set(tint[0], tint[1], tint[2]);
      const prev = R.getRenderTarget(); R.setRenderTarget(rt); R.render(sc, cam); R.setRenderTarget(prev); return rt.texture; }
    return { blend }; })();
  // ---------------- state of the sky at a moment, and applying it ----------------
  const MA = MODES.auto = { az: 230, el: 40, sun: 3.6, sunC: 0xffffff, hemi: 0.18, env: 1, zen: 0, hor: 0, glowK: 0, cloud: 0, cc: 0, cs: 0, fog: 0, exp: 1.22, expIn: 1.8, L: [0, 0.6, 0, 0, 0, 2.2, 1.4], stove: 0xc8692a, paper: 0, screen: 0.12, fogD: 2.4e-5 };
  MODES.night = MA;
  const NIGHT_JD = Date.UTC(2026, 7, 27, 21, 30) / 864e5 + 2440587.5;   // fixed "Nacht": 27 August 2026, 23:30 – full moon in the south-south-east at 24°
  const _sd = new THREE.Vector3(), _md = new THREE.Vector3(), _ld = new THREE.Vector3(), _e3 = new THREE.Matrix3();
  const SM = window.SKYMAN || {};
  function photoP(m, v4, v2) { const h = SM[m]; if (!h) return; const sd = skyU.sunDir.value, phiS = atan2(sd.z, sd.x); v4.set(h.lo, h.hi, h.crop, phiS / (2 * Math.PI) + 0.5 - h.sun_u); v2.set(m === 'dusk' ? -3 : (h.sun_elevation_deg || 30), h.gain ?? 1); }
  function nowJD() { return S.mode === 'night' ? NIGHT_JD : jdOf(CLOCK.t); }
  function compute() { const s = skyAt(nowJD()); const top = typeof P !== 'undefined' && P.mode === 'top'; S.top = top;
    if (top) { s.sunAz = 205; s.sunEl = 52; s.top = true; }   // plan view: neutral midday light whatever the hour
    lookAt(s.sunEl); const L = LOOK;
    const night = sst(-3, -10, s.sunEl), mUp = sst(-1, 6, s.moonEl), mVis = Math.pow(s.illum, 3.5) * mUp;   // a half moon gives about a tenth of the full moon's light
    s.night = night; s.mVis = mVis; s.moonI = top ? 0 : 0.11 * mVis * night;
    s.env = L.env + 0.05 * mVis * night; s.gi = L.gi * s.env / Math.max(1e-3, L.env); s.lim = 6.1 - 2.6 * mVis; s.starK = top ? 0 : sst(-4.5, -11, s.sunEl);
    return s; }
  // light direction: the sun by day and in the twilight, the moon at night
  function lightOf(s) { if (s.sunEl > -3 || s.top) return { dir: dirAz(s.sunAz, s.sunEl, _ld), I: LOOK.sun, col: LOOK.sunC, moon: false };
    return { dir: dirAz(s.moonAz, Math.max(s.moonEl, 2), _ld), I: s.moonI, col: MOONC, moon: true }; }
  const MOONC = C(0xa9c0ff);
  function todOf(s) { return s.top || s.sunEl > 12 ? 'day' : s.sunEl > -1 ? 'gold' : 'dusk'; }
  // the full application (mode switch or force) and the light per tick: thresholds keep a still picture still
  function apply(force) { if (!S.active) return; const s = compute(), L = LOOK, lo = lightOf(s), A = S.ap; S.cur = s;
    const moved = force || !A || lo.dir.angleTo(A.dir) > 0.0021 || lo.moon !== A.moon || Math.abs(lo.I - A.I) > Math.max(0.01, A.I * 0.02);
    const fade = force || !A || Math.abs(L.exp - A.exp) > 0.006 || Math.abs(s.env - A.env) > Math.max(0.002, A.env * 0.015) || Math.abs(s.starK - A.starK) > 0.01 || Math.abs(L.nK - A.nK) > 0.005 || Math.abs(L.gS - A.gS) > Math.max(0.002, A.gS * 0.02) || Math.abs(s.lst - A.lst) > 0.25 || Math.abs(s.mVis - A.mVis) > 0.01;
    if (!moved && !fade) return;
    // MODES.auto holds the values other modules read (exposure, lamps, plan view)
    MA.az = s.sunAz; MA.el = s.sunEl; MA.sun = lo.I; MA.sunC = lo.col.getHex(); MA.hemi = L.hemi; MA.env = s.env; MA.exp = L.exp; MA.expIn = L.expIn; MA.fogD = L.fogD; MA.paper = L.paper; MA.L = L.L.slice(); MA.stove = L.stove.getHex();
    sunDir = lo.dir.clone(); sun.intensity = lo.I; sun.color.copy(lo.col); hemi.intensity = L.hemi; scene.environmentIntensity = s.env;
    skyU.sunDir.value.copy(dirAz(s.sunAz, s.sunEl, _sd)); skyU.zen.value.copy(L.zen); skyU.hor.value.copy(L.hor); skyU.glowK.value = L.glowK; skyU.cloudK.value = L.cloud; skyU.cloudCol.value.copy(L.cc); skyU.cloudShade.value.copy(L.cs);
    scene.fog.color.copy(L.fog); if (scene.fog.isFogExp2) scene.fog.density = s.top ? 0 : L.fogD;
    if (window.FIELDU) FIELDU.uCloudK.value = L.cloudK;
    adaptExposure(0, !A || force);
    if (moved) { placeSun(V(sunC[0], sunC[1], 3)); }
    // sky
    SU.sunEl.value = s.sunEl; SU.gS.value = L.gS; SU.nK.value = L.nK; SU.sunD.value.copy(_sd); SU.moonDir.value.copy(dirAz(s.moonAz, s.moonEl, _md));
    const mk = s.moonEl > -1 && !s.top ? 1 : 0; SU.moonK.value = mk * (1.4 + 1.2 * s.night); SU.glowM.value = mk * 0.03 * s.mVis * s.night * 4;
    const moonBoost = 1 + 2.5 * s.mVis; SU.zenN.value.setRGB(0.0016 * moonBoost, 0.0033 * moonBoost, 0.0088 * moonBoost); SU.horN.value.setRGB(0.0062 * moonBoost, 0.0074 * moonBoost, 0.0118 * moonBoost);
    SU.mwK.value = 0.022 * s.starK * (1 - 0.85 * sst(0, 0.3, s.mVis));
    eqBasis(s.lst, STARS.rot); _e3.setFromMatrix4(STARS.rot).transpose(); SU.uEq.value.copy(_e3);
    STARS.U.uK.value = s.starK; STARS.U.uLim.value = s.lim; STARS.pts.visible = s.starK > 0.003;
    skyTextures(L);
    envUpdate(L, s);
    if (window.giApply) { const k = giKeyOf(); if (k !== S.giKey) { S.giKey = k; giApply(); } else if (GI.on.value && Math.abs(GI.k.value - giWant().g) > 0.004) { GI.k.value = giWant().g; } }
    GI.tint.value.set(L.tint[0], L.tint[1], L.tint[2]);   // the baked light takes the night's blue like the image light
    // lamps (automatic unless switched by hand), the stove's glow colour, sounds
    const lampSig = L.L.map(v => v.toFixed(1)).join() + '|' + L.paper.toFixed(2);
    if (lampSig !== S.lampSig && window.LIGHTSTATE) { S.lampSig = lampSig; if (force || !A) LIGHTSTATE.reset(); else LIGHTSTATE.apply(); }
    glowMat.color.copy(L.stove); if (window.STOVE) STOVE.apply();
    const tod = todOf(s); if (tod !== S.tod) { S.tod = tod; audio.setTime(tod); }
    S.cur = s; S.ap = { dir: lo.dir.clone(), I: lo.I, moon: lo.moon, exp: L.exp, env: s.env, starK: s.starK, nK: L.nK, gS: L.gS, lst: s.lst, mVis: s.mVis };
    hudIcon(s); markDirty(moved); }
  // photographs for the blend (loaded on demand, the next one ahead of time)
  function skyTextures(L) { const a = L.texA, b = L.texB, ta = skyLoad(a), tb = b ? skyLoad(b) : null;
    if (!ta) { sky.material = skyMat; return; }
    SU.tA.value = ta; photoP(a, SU.pA.value, SU.eA.value);
    if (b && tb) { SU.tB.value = tb; photoP(b, SU.pB.value, SU.eB.value); SU.kB.value = L.kTex; } else { SU.tB.value = ta; SU.kB.value = 0; }
    sky.material = dnSkyMat; const nx = nextTex(a); if (nx) skyLoad(nx); }
  const ORDER = ['day', 'gold', 'dusk'], nextTex = m => { const s = S.cur; if (!s) return null; const rising = sunTrend() > 0, i = ORDER.indexOf(m); return ORDER[i + (rising ? -1 : 1)] || null; };
  function sunTrend() { const t = CLOCK.t, a = skyAt(jdOf(t)).sunEl, b = skyAt(jdOf(t + 10)).sunEl; return b - a; }
  // environment: both prefiltered maps loaded → mixed (only when the mix moved by 2 % or the tint by 1 %)
  function envUpdate(L, s) { const a = L.texA, b = L.texB, ra = envLoad(a), rb = b ? envLoad(b) : null; if (!ra) return;
    const nx = nextTex(a); if (nx) envLoad(nx);
    const H = window.HDRIMAN || {}, k = b && rb ? L.kTex : 0, uA = (H[a] || {}).sun_u ?? 0.6, uB = b ? ((H[b] || {}).sun_u ?? 0.6) : uA;
    const phiH = 2 * Math.PI * ((uA + (uB - uA) * k) - 0.5), phiS = Math.atan2(skyU.sunDir.value.z, skyU.sunDir.value.x); scene.environmentRotation.set(0, -(phiS - phiH) * (window.ENV_SIGN || 1), 0);
    const tint = L.tint, plain = k < 0.01 && Math.abs(tint[0] - 1) + Math.abs(tint[1] - 1) + Math.abs(tint[2] - 1) < 0.01;
    const key = a + '|' + (k ? b : '') + '|' + (Math.round(k * 50) / 50) + '|' + tint.map(v => (Math.round(v * 100) / 100)).join();
    if (key === S.envKey) return; S.envKey = key;
    scene.environment = plain ? ra.texture : ENVB.blend(ra.texture, k ? rb.texture : null, Math.round(k * 50) / 50, tint); }
  // what the baked indirect light should show (render/render.js giApply): two modes, their mix, a gain
  function giWant() { const s = S.cur, L = LOOK; if (!s) return { a: 'day', b: null, k: 0, g: 1 }; const k = L.texB ? Math.round(L.kTex * 25) / 25 : 0;
    return { a: k >= 1 ? L.texB : L.texA, b: k > 0 && k < 1 ? L.texB : null, k: k >= 1 ? 0 : k, g: s.gi }; }
  const giKeyOf = () => { const w = giWant(); return (window.VARIANT || '') + w.a + '|' + (w.b || '') + '|' + w.k; };
  // ---------------- HUD: the clock button shows sun, twilight or moon ----------------
  const ICONS = { sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
    tw: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.5h18M7 17.5a5 5 0 0 1 10 0M12 7.2v2.2M5.6 10.6l1.5 1.5M18.4 10.6l-1.5 1.5M8.5 21h7"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>' };
  function hudIcon(s) { const k = !S.active ? 'clock' : s.sunEl > 3 ? 'sun' : s.sunEl > -6 ? 'tw' : 'moon'; if (k === S.icon) return; S.icon = k; const b = document.querySelector('#clockbtn .hbi'); if (b) b.innerHTML = ICONS[k];
    const cb = $('clockbtn'); if (cb) cb.dataset.dn = k; }
  // ---------------- enable / disable (setMode in render/modes.js delegates here) ----------------
  function enable(m) { S.mode = m === 'night' ? 'night' : 'auto'; S.active = true; MODE = S.mode; window.MODE_NOW = S.mode; S.ap = null; S.envKey = ''; S.giKey = ''; S.lampSig = ''; S.tod = '';
    apply(true); if (window.RATSCHER && RATSCHER.top) RATSCHER.topMode(true); markDirty(true); }
  function disable() { if (!S.active) return; S.active = false; STARS.pts.visible = false; S.icon = ''; hudIcon({}); GI.k.value = 1; GI.tint.value.set(1, 1, 1); }
  // ---------------- the clock drives it: per tick, cheap; heavy work only past the thresholds ----------------
  let acc = 0;
  window.TICKS.push(dt => { if (!S.active) return; acc += dt; const warp = CLOCK.warp, top = typeof P !== 'undefined' && P.mode === 'top';
    if (top !== S.top) { apply(true); return; }
    if (acc < (warp ? 0.05 : 0.2)) return; acc = 0; apply(false); nightHint(); });
  // ---- a hint at the first dusk ----
  function nightHint() { const s = S.cur; if (S.hint || !s || s.sunEl > -2 || S.mode !== 'auto' || !(typeof P !== 'undefined' && P.mode === 'walk')) return; S.hint = true; save();
    toast('Die Sonne ist untergegangen. Im Pavillon gehen die Lampen an, die Werkstatt hat Licht mit Bewegungsmelder. Schlafen: auf das Tagesbett legen – oder über die Uhr oben rechts bis morgen warten.', 9000); }
  // ---------------- sleeping: lying down after dark → time-lapse until 7:00 ----------------
  const canSleep = () => S.active && S.cur && (S.cur.sunEl < -2 || ((CLOCK.t % 1440) + 1440) % 1440 >= 21 * 60) && !CLOCK.warp && !CLOCK.focused;
  function sleep() { if (!canSleep()) return; const m = CLOCK.until(7); PLAY.think('Gute Nacht …', 2400); CLOCK.wait(m, 'Schlafen', () => { PLAY.think('Guten Morgen! ' + dateStr(CLOCK.t, true) + ', 7:00 Uhr.', 4200); }); }
  // ---------------- clock window: date, sun and moon times, changing the date ----------------
  function winHTML() { const t = CLOCK.t, s = skyAt(jdOf(t)), rs = riseSet(t, 'sun'), rm = riseSet(t, 'moon'), pct = Math.round(s.illum * 100);
    const ph = s.illum > 0.97 ? 'Vollmond' : s.illum < 0.03 ? 'Neumond' : (s.waxing ? 'zunehmend' : 'abnehmend') + ', ' + pct + ' %';
    return `<div class="ckdate"><b>${dateStr(t, true)}</b><span>Sonne ${hmOf(rs.up)} – ${hmOf(rs.down)}</span><span>Mond ${[[rm.up, '↑'], [rm.down, '↓']].filter(q => q[0] != null).sort((p, q) => p[0] - q[0]).map(q => q[1] + ' ' + hmOf(q[0])).join(' ')}${rm.up == null && rm.down == null ? '–' : ''} · ${ph}</span></div>
      <div class="mrow"><span>Datum</span><div class="mseg"><button type="button" data-dmon="-1">◀ Monat</button><button type="button" data-dmon="0">Heute</button><button type="button" data-dmon="1">Monat ▶</button></div></div>
      ${S.active ? '' : '<p class="mnote">Das Licht steht fest (Menü → Licht). Mit „Tageslauf“ folgen Sonne, Mond und Sterne der Uhr.</p>'}`; }
  function winBind(win) { win.querySelectorAll('[data-dmon]').forEach(b => b.addEventListener('click', () => { const k = +b.dataset.dmon, day = Math.floor(CLOCK.t / 1440);
    if (k === 0) { const now = new Date(); S.e0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5 - day; }
    else { const q = ymd(edayOf(CLOCK.t)), d = new Date(Date.UTC(q.y, q.m + k, 1)), dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); S.e0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), Math.min(q.d, dim)) / 864e5 - day; }
    save(); if (S.active) apply(true); CLOCK.ui(); if (CLOCK.setWin) CLOCK.setWin(true); })); }
  // the sky material is compiled with everything else while the loading screen is up (an invisible carrier)
  { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), dnSkyMat); q.visible = false; q.userData.noMerge = true; scene.add(q); }
  return { get active() { return S.active; }, get mode() { return S.mode; }, enable, disable, update: apply, giWant, sky: skyAt, jdOf, riseSet, dateStr, dateShort, winHTML, winBind, canSleep, sleep,
    dbg: () => ({ exp: +R.toneMappingExposure.toFixed(2), sun: +sun.intensity.toFixed(2), env: +scene.environmentIntensity.toFixed(3), gi: GI.on.value + ' k' + GI.k.value.toFixed(2), stars: +STARS.U.uK.value.toFixed(2), sky: sky.material === dnSkyMat ? 'dn' : sky.material === skyMat ? 'proc' : 'photo', tex: LOOK.texA + '/' + LOOK.texB + ' ' + LOOK.kTex.toFixed(2) }),
    summer: () => { const q = ymd(edayOf(CLOCK.t)); return q.m >= 4 && q.m <= 8; },
    get state() { return S.cur; }, ready: () => { const L = LOOK; return !!(skyLoad(L.texA) && (!L.texB || skyLoad(L.texB)) && envLoad(L.texA) && (!L.texB || envLoad(L.texB)) && !GIMIX.job); }, get e0() { return S.e0; }, set e0(v) { S.e0 = Math.round(v); save(); if (S.active) apply(true); }, LOOK, KF, STARS, SU, lookAt, hint: () => S.hint };
})();
window.DN = DN;
