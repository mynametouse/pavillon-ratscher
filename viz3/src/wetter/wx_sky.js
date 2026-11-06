// ===================== feat/wetter: clouds, light and haze of the weather (WXSKY) =====================
// The sky stays the blend of photographed skies (time/daynight.js); over it lies a cloud deck drawn in the same program (its fragment
// shader is extended here, before it is compiled at load – no new shader program): broken clouds from a drifting noise as thick as the
// cloud cover says, a closed grey deck when it is overcast (brighter at the zenith like a real overcast sky), darker when it rains, the
// whole sky sinking into the fog when the visibility drops. The light follows (DN.hook.look, applied with the day's light): the direct sun
// through the clouds – a cloud drifting over the sun dims it at the moment it covers it in the sky (the same noise on the CPU) –, more
// diffuse sky light, the eye adapting, grey haze from the visibility (the larger of the day's haze and the weather's – the zombie night's
// fog stays on top: its density hook reads the larger one), no stars and no moonlight under a closed deck, cloud shadows on the far land
// only while clouds are broken, drifting with the wind.
import * as THREE from 'three';
import { markDirty } from '../core/assets.js';
import { FIELDU } from '../garden/env.js';
import { DN } from '../time/daynight.js';
export const WXSKY = (() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
    sst = (a, b, x) => {
      const t = clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    },
    fr = x => x - Math.floor(x);
  // the weather as the picture needs it (wetter/wetter.js sets it, eased): on, cover 0–1, rain mm/h, snow cm/h, vis m, wind m/s, dir °
  const W = { on: false, cover: 0, rain: 0, snow: 0, vis: 60000, wind: 0, dir: 250, flash: 0 };
  const U = {
    wxCov: { value: 0 },
    wxDark: { value: 0 },
    wxFog: { value: 0 },
    wxFlash: { value: 0 },
    wxCol: { value: new THREE.Color(0.6, 0.6, 0.62) },
    wxHor: { value: new THREE.Color(0.6, 0.6, 0.62) },
    wxSun: { value: new THREE.Color(1, 0.95, 0.85) },
    // the low sun lighting the clouds from below (sunset, sunrise)
    wxLow: { value: new THREE.Color(0, 0, 0) },
    // a bolt of lightning: x its azimuth (rad, three.js x/z), y strength, z a seed for its zigzag, w width (rad)
    wxBolt: { value: new THREE.Vector4(0, 0, 0, 0.0025) },
    wxGlow: { value: new THREE.Color(0, 0, 0) },
    // where the towns lie (three.js x, z of the horizontal direction): Schleusingen (4.7 km) and Suhl (16.6 km) at 338°,
    // Hildburghausen (6.1 km) at 216° from Ratscher
    wxTown: { value: new THREE.Vector4(-0.36, -0.93, -0.59, 0.81) },
    wxT: { value: new THREE.Vector2(0, 0) },
    // a rainbow opposite the sun (0 none – ~0.35 vivid)
    wxBow: { value: 0 },
    // a clear sky (0 the photographs as they are – 1 their clouds gone): the day's gradient (zenith, horizon) and the sun's glow
    wxClr: { value: 0 },
    wxCZ: { value: new THREE.Color() },
    wxCH: { value: new THREE.Color() },
    wxCG: { value: new THREE.Color() },
  };
  // ---- the cloud layer in the sky's program: the same noise as wxMask below ----
  // the deck as a function of the direction: shared by the sky and the stars
  const DECK = `uniform float wxCov; uniform vec2 wxT;
     float wxH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
     float wxN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
       return mix(mix(wxH(i), wxH(i + vec2(1.0, 0.0)), u.x), mix(wxH(i + vec2(0.0, 1.0)), wxH(i + vec2(1.0, 1.0)), u.x), u.y); }
     float wxFbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * wxN(p); p = p * 2.07 + vec2(5.3, 1.7); a *= 0.5; } return s / 0.96875; }
     // the deck seen in direction d: x cover (0–1) at this point, y thickness (0 thin edge – 1 dense core)
     vec2 wxDeck(vec3 d){ float up = max(d.y, 0.0); vec2 q = d.xz / (up + 0.06) * 1.6 - wxT; float n = wxFbm(q);
       float th = 0.75 - wxCov * 0.5, m = smoothstep(th - 0.07, th + 0.07, n);
       float far = smoothstep(0.02, 0.16, up); m = mix(wxCov, m, far);
       m = mix(m, 1.0, smoothstep(0.78, 1.0, wxCov));
       return vec2(m, clamp((n - th) / 0.3, 0.0, 1.0)); }
     `;
  const GLSL =
    DECK +
    `uniform float wxDark, wxFog, wxFlash, wxBow, wxClr; uniform vec3 wxCol, wxHor, wxSun, wxGlow, wxLow, wxCZ, wxCH, wxCG;
     uniform vec4 wxTown, wxBolt;
     // the colours across a rainbow's band: t 0 its inner edge (violet) – 1 its outer edge (red), soft at both edges
     vec3 wxBowC(float t){ float h = 0.76 * (1.0 - t);
       return clamp(abs(fract(vec3(h) + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0) * sin(3.14159 * t); }
     vec3 wxSky(vec3 c, vec3 d, vec3 sd){
       if (wxCov < 0.002 && wxFog < 0.002 && wxFlash < 0.002 && wxBow < 0.002 && wxClr < 0.002) return c;
       // a clear sky: the photographs' own clouds give way to the day's gradient – the zenith blue, the horizon pale – and the sun's
       // glow around it (the deck below brings clouds back as the cover grows)
       if (wxClr > 0.002) { float u0 = max(d.y, 0.0), s0 = max(dot(d, sd), 0.0);
         vec3 cl = mix(wxCH, wxCZ, pow(u0, 0.5)) + wxCG * (0.35 * pow(s0, 6.0) + 0.6 * pow(s0, 48.0) + 18.0 * pow(s0, 1800.0));
         c = mix(c, cl, wxClr * smoothstep(-0.04, 0.03, d.y)); }
       // (no wisps of the noise in a sky of no cover at all)
       float up = max(d.y, 0.0); vec2 k = wxDeck(d); k.x *= smoothstep(0.0, 0.03, wxCov);
       float closed = smoothstep(0.78, 1.0, wxCov), s = max(dot(d, sd), 0.0);
       // broken clouds: thin edges bright, cores grey; a closed deck: soft structure, brighter towards the zenith; darker when it rains
       float shade = mix(1.12 - 0.42 * k.y, 0.92 + 0.12 * (1.0 - k.y), closed) * (0.8 + 0.42 * up) * (1.0 - 0.38 * wxDark);
       vec3 cc = wxCol * shade + wxSun * pow(s, 10.0) * (1.0 - k.y) * (1.0 - closed) * 0.9;
       // sunset and sunrise: the low sun lights the undersides warm across much of the sky, most towards itself, the thin parts most
       cc += wxLow * (0.3 + 0.7 * pow(s, 3.0)) * (1.0 - 0.5 * k.y) * (1.0 - 0.75 * closed) * (0.6 + 0.4 * (1.0 - up));
       vec2 hz = normalize(d.xz + vec2(1e-5)); float tw = 0.35 + 0.65 * pow(max(dot(hz, wxTown.xy), 0.0), 2.0) + 0.5 * pow(max(dot(hz, wxTown.zw), 0.0), 2.0);
       cc += wxGlow * tw * (0.15 + 0.85 * (1.0 - up) * (1.0 - up));
       cc = mix(wxHor, cc, smoothstep(-0.02, 0.1, d.y));
       c = mix(c, cc, k.x);
       c += vec3(0.82, 0.86, 1.0) * wxFlash * (0.45 + 0.55 * k.x);
       // the bolt: from the cloud base down to the land, its course zigzagging with the height; a faint glow around it
       if (wxBolt.y > 0.0) { float el = asin(clamp(d.y, -1.0, 1.0));
         if (el > -0.01 && el < 0.42) { float t = el / 0.42;
           float off = (wxN(vec2(t * 9.0, wxBolt.z)) - 0.5) * 0.07 + (wxN(vec2(t * 37.0, wxBolt.z + 7.0)) - 0.5) * 0.018;
           float da = atan(d.x, -d.z) - (wxBolt.x + off); da = mod(da + 3.14159265, 6.28318531) - 3.14159265;
           c += vec3(0.86, 0.9, 1.0) * wxBolt.y * (8.0 * exp(-da * da / (wxBolt.w * wxBolt.w)) + 0.35 * exp(-da * da / 0.0012)); } }
       // the rainbow around the point opposite the sun: the primary at 40.4–42.6° (violet inside, red outside), the secondary at
       // 50.4–53.8° (the colours reversed, fainter), the sky just inside the primary a little brighter; as bright as the light now
       if (wxBow > 0.002) { float a = degrees(acos(clamp(dot(d, -sd), -1.0, 1.0)));
         float t1 = (a - 40.4) / 2.2, t2 = (53.8 - a) / 3.4; vec3 b = vec3(0.0);
         if (t1 > 0.0 && t1 < 1.0) b += wxBowC(t1);
         if (t2 > 0.0 && t2 < 1.0) b += 0.42 * wxBowC(t2);
         b += vec3(0.05) * smoothstep(25.0, 40.4, a) * step(a, 40.4);
         c += b * wxBow * 1.2 * dot(wxCol, vec3(0.3, 0.59, 0.11)) * smoothstep(-0.005, 0.03, d.y); }
       return mix(c, wxHor, wxFog); }
     `;
  const M = DN.skyMat;
  if (M && M.fragmentShader && !M.fragmentShader.includes('wxSky')) {
    Object.assign(M.uniforms, U);
    M.fragmentShader = M.fragmentShader
      .replace('void main(){', GLSL + 'void main(){')
      .replace('gl_FragColor = vec4(c, 1.0);', 'c = wxSky(c, d, normalize(sunD)); gl_FragColor = vec4(c, 1.0);');
  }
  const patched = !!(M && M.fragmentShader.includes('wxSky(c, d'));
  // the stars are points of their own, drawn over the sky: behind a cloud a star goes out (the same deck, looked up per star in its
  // vertex shader – compiled at load with the stars, no program at night)
  const SM = DN.STARS && DN.STARS.pts && DN.STARS.pts.material;
  if (SM && SM.vertexShader && !SM.vertexShader.includes('wxDeck')) {
    Object.assign(SM.uniforms, { wxCov: U.wxCov, wxT: U.wxT });
    SM.vertexShader = SM.vertexShader
      .replace('void main(){', DECK + 'void main(){')
      .replace('vC = aCol *', 'if (wxCov > 0.002) vA *= 1.0 - wxDeck(wd).x; vC = aCol *');
  }
  const starsPatched = !!(SM && SM.vertexShader.includes('vA *= 1.0 - wxDeck(wd).x'));
  // ---- the same noise on the CPU: is there a cloud in front of the sun right now? ----
  function h12(x, y) {
    let a = fr(x * 0.1031),
      b = fr(y * 0.1031),
      c = fr(x * 0.1031);
    const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
    a += d;
    b += d;
    c += d;
    return fr((a + b) * c);
  }
  function n2(x, y) {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy,
      ux = fx * fx * (3 - 2 * fx),
      uy = fy * fy * (3 - 2 * fy);
    const a = h12(ix, iy),
      b = h12(ix + 1, iy),
      c = h12(ix, iy + 1),
      e = h12(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + e) * ux * uy;
  }
  function fbm(x, y) {
    let s = 0,
      a = 0.5;
    for (let i = 0; i < 5; i++) {
      s += a * n2(x, y);
      x = x * 2.07 + 5.3;
      y = y * 2.07 + 1.7;
      a *= 0.5;
    }
    return s / 0.96875;
  }
  // the deck's cover in direction (x, y, z) of the three.js world (y up), as the sky draws it
  function deck(dx, dy, dz, cov = W.cover) {
    const up = Math.max(dy, 0),
      qx = (dx / (up + 0.06)) * 1.6 - U.wxT.value.x,
      qy = (dz / (up + 0.06)) * 1.6 - U.wxT.value.y,
      n = fbm(qx, qy),
      th = 0.75 - cov * 0.5;
    let m = sst(th - 0.07, th + 0.07, n);
    m = cov + (m - cov) * sst(0.02, 0.16, up);
    return m + (1 - m) * sst(0.78, 1, cov);
  }
  const S = { mask: 0, maskT: 0, v: 0, sig: '', patched };
  const _g = new THREE.Color(),
    // a clear zenith a touch deeper blue than the painted sky's
    ZDEEP = new THREE.Color(0.75, 0.85, 1);
  const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  // ---- the light of the moment under this weather (DN.hook.look: LOOK and the sky state s, before they are applied) ----
  function look(L, s) {
    if (!W.on) {
      U.wxCov.value = 0;
      U.wxFog.value = 0;
      U.wxClr.value = 0;
      return;
    }
    // a clear sky (from the data, not the calendar's): the photographs' clouds give way by day, with the sun above ~10° (lower, the glow
    // of dawn and dusk lies on one side of the sky – the photographs keep it, clouds and all; at night the night's own gradient). The
    // gradient is the day's (DN's anchors, matched to the photographs' measured zenith and horizon), the zenith a touch deeper; the
    // glow in the colour of the sun
    const clr = (W.clear || 0) * clamp(L.gS, 0, 1) * (1 - clamp(L.nK || 0, 0, 1)) * sst(3, 10, s.sunEl);
    U.wxClr.value = clr;
    if (clr > 0) {
      U.wxCZ.value.copy(L.zen).multiply(ZDEEP);
      U.wxCH.value.copy(L.hor);
      U.wxCG.value.copy(L.sunC);
    }
    const c = W.cover,
      wet = clamp((W.rain + 2.5 * W.snow) / 5, 0, 1),
      dark = clamp(W.rain / 5, 0, 1),
      day = 1 - (s.night || 0),
      closed = sst(0.7, 1, c),
      block = Math.max(S.mask, closed);
    // haze from the visibility: exponential-squared fog reaches 5 % contrast at the visibility (density √3 / V); clear air keeps the day's
    const fogV = W.vis < 20000 ? (1.732 / W.vis) * sst(20000, 9000, W.vis) : 0;
    L.fogD = Math.max(L.fogD, fogV);
    const fogK = sst(2500, 250, W.vis);
    // the horizon (and the haze over the land) turns grey under clouds, darker in rain (snow clouds stay light)
    const g = lum(L.fog);
    _g.setRGB(g * 0.98, g, g * 1.05).multiplyScalar(1 - 0.32 * dark);
    L.fog.lerp(_g, clamp(c * 0.85 + fogK, 0, 1));
    U.wxHor.value.copy(L.fog);
    // the clouds' own colour: the grey of the horizon, a little brighter (seen from below the deck is lit from above)
    U.wxCol.value.copy(L.fog).multiplyScalar(1.12);
    U.wxSun.value.copy(L.sunC).multiplyScalar(Math.min(2.5, L.sun * 0.5) * day);
    // the low sun under the clouds (from 14° down to just below the horizon): warm undersides, as bright as the sky there
    const low = sst(-4.5, 0.5, s.sunEl) * sst(14, 3, s.sunEl);
    U.wxLow.value.copy(L.sunC).multiplyScalar(low * 0.75 * g);
    U.wxCov.value = c;
    U.wxDark.value = dark;
    U.wxFog.value = fogK;
    // the direct sun through the clouds (a cloud over the sun, or the closed deck), less in rain and fog
    L.sun *= (1 - 0.93 * block) * (1 - 0.45 * wet) * (1 - 0.85 * fogK);
    // more of the light comes from the whole sky; the image light loses some (its photographed sun is gone); the eye adapts
    L.hemi *= 1 + 0.5 * c * day;
    const envK = 1 - 0.28 * c - 0.18 * wet;
    s.env *= envK;
    s.gi *= envK;
    L.exp *= 1 + (0.32 * c + 0.12 * wet) * day;
    // cloud shadows on the far land only while the clouds are broken; the painted sky (shown until the photos load) clouds over too
    L.cloudK *= 4 * c * (1 - c) * (1 - closed);
    L.cloud = Math.max(L.cloud, c);
    L.glowK *= 1 - 0.85 * c;
    L.cc.lerp(U.wxCol.value, c);
    L.cs.lerp(_g, c);
    // night: the lights of the towns around (Schleusingen, Suhl, Hildburghausen) light the underside of a deck dull orange-grey, the
    // haze over the land a little too – an overcast night is never quite black
    const glow = (s.night || 0) * clamp(c * 1.2 - 0.2, 0, 1) * (1 - 0.5 * fogK);
    U.wxGlow.value.setRGB(0.0065, 0.0045, 0.0029).multiplyScalar(glow);
    L.fog.r += 0.0035 * glow;
    L.fog.g += 0.0025 * glow;
    L.fog.b += 0.0016 * glow;
    U.wxHor.value.copy(L.fog);
    // night: under broken clouds each star goes out behind a cloud (its own shader); a closed deck or fog hides them all, and the
    // moonlight on the land fades with the cover
    const hide = clamp(sst(0.3, 0.9, c) + fogK, 0, 1);
    s.starK *= 1 - clamp((starsPatched ? sst(0.75, 0.97, c) : hide) + fogK, 0, 1);
    s.moonI *= (1 - 0.85 * hide) * (s.sunEl > -3 ? 1 : 1 - 0.85 * S.mask);
    s.lim -= 1.0 * c;
  }
  if (DN.hook) DN.hook.look = look;
  // ---- per frame (wetter/wetter.js): the clouds drift with the wind, the sun's cloud is looked up a few times a second ----
  let drawT = 0;
  function tick(dt, real = true) {
    if (!W.on) {
      if (S.mask) {
        S.mask = 0;
        bump();
      }
      if (U.wxBow.value) {
        U.wxBow.value = 0;
        markDirty();
      }
      return;
    }
    // the deck at about 1.5 km drifts with ~2.5 × the wind at the ground (at least a slow drift); it moves towards where the wind blows
    const v = Math.max(3, W.wind * 2.5),
      a = (W.dir * Math.PI) / 180,
      k = (1.6 / 1500) * v * dt;
    U.wxT.value.x += -Math.sin(a) * k;
    U.wxT.value.y += Math.cos(a) * k;
    if (FIELDU && FIELDU.uFT) FIELDU.uFT.value += dt * v * 0.004;
    // the drifting clouds need a picture now and then (a still view keeps still otherwise); rain and snow draw every frame anyway
    if (real && (drawT += dt) > 2.5 && W.cover > 0.05 && W.cover < 0.97) {
      drawT = 0;
      markDirty();
    }
    // a cloud in front of the sun: looked up four times a second, in steps (the light changes only when it really changes)
    if ((S.maskT += dt) < 0.25) return;
    S.maskT = 0;
    const st = DN.state,
      sd = DN.SU && DN.SU.sunD ? DN.SU.sunD.value : null,
      md = DN.SU && DN.SU.moonDir ? DN.SU.moonDir.value : null;
    // the light of the moment – the sun by day and in the twilight, the moon at night – and a little around its disc: a cloud edge
    // dims it before it covers the centre
    const L = st && st.sunEl > -3 ? sd : st && st.moonEl > 0 ? md : null;
    let m = 0;
    if (L) m = Math.max(deck(L.x, Math.max(L.y, 0.02), L.z), 0.7 * deck(L.x + 0.02, Math.max(L.y, 0.02), L.z + 0.02));
    // as the sky draws it: no cloud at no cover
    m *= sst(0, 0.03, W.cover);
    m = Math.round(m * 20) / 20;
    if (m !== S.mask) {
      S.mask = m;
      bump();
    }
    // a rainbow: wished for by the showers (wetter/wetter.js), seen while no cloud stands in front of the sun and the sun is between
    // ~1° and 42° high (higher, the bow lies below the horizon)
    const el = st ? st.sunEl : -90,
      bow = Math.round(0.35 * (W.bow || 0) * (1 - S.mask) * sst(0.5, 4, el) * (1 - sst(36, 42, el)) * 100) / 100;
    if (bow !== U.wxBow.value) {
      U.wxBow.value = bow;
      markDirty();
    }
  }
  function bump() {
    if (DN.hook) DN.hook.v++;
  }
  // the weather to show (eased by the caller); a visible change asks the day's light to apply it again
  function set(p) {
    const sig = [
      p.on ? 1 : 0,
      Math.round(p.cover * 100),
      Math.round(p.rain * 20),
      Math.round(p.snow * 40),
      Math.round(Math.log(Math.max(30, p.vis)) * 40),
      Math.round((p.clear || 0) * 20),
    ].join();
    W.on = !!p.on;
    W.cover = p.cover;
    W.rain = p.rain;
    W.snow = p.snow;
    W.vis = p.vis;
    W.wind = p.wind;
    W.dir = p.dir;
    W.bow = p.bow || 0;
    W.clear = p.clear || 0;
    if (sig !== S.sig) {
      S.sig = sig;
      bump();
    }
  }
  return { W, U, S, set, tick, look, deck, sunMask: () => S.mask, patched, starsPatched };
})();
