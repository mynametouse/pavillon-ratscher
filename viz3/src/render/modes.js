// ---------------- light modes ----------------
let MODE = 'gold';
const MODES = {
  day:  { az: 228, el: 46, sun: 3.6, sunC: 0xfff4e2, hemi: 0.18, env: 1.0, zen: 0x6f9dd6, hor: 0xe6e9ec, glowK: 0.35, cloud: 0.5, cc: 0xffffff, cs: 0xa8b0bc, fog: 0xdfe4e6, exp: 1.22,  L: [0, 0.6, 0, 0, 0, 2.2, 1.4], stove: 0xc8692a, paper: 0.0, screen: 0.12 },
  gold: { az: 246, el: 11, sun: 3.8, sunC: 0xffc98e, hemi: 0.16, env: 0.85, zen: 0x7aa1cf, hor: 0xf3d7ae, glowK: 0.9, cloud: 0.45, cc: 0xfff0dc, cs: 0xb39c90, fog: 0xe8dbc4, exp: 1.3, L: [5, 5, 3, 4, 0, 5, 4], stove: 0xff9a3c, paper: 0.55, screen: 0.25 },
  dusk: { az: 262, el: 1.5, sun: 0.8, sunC: 0xff9658, hemi: 0.08, env: 0.75, zen: 0x2c3c66, hor: 0xe7a573, glowK: 1.3, cloud: 0.4, cc: 0xe9a07c, cs: 0x4c4a63, fog: 0x8f879a, exp: 1.5, L: [24, 18, 14, 26, 10, 12, 9], stove: 0xffa84c, paper: 1.7, screen: 0.5 },
};
// eye adaptation: inside the closed pavilion the exposure opens up (smoothly while walking, at once for still pictures and panoramas) –
// otherwise a daylight room looks like a photo exposed for the garden
MODES.day.expIn = 1.8; MODES.gold.expIn = 1.15; MODES.dusk.expIn = 1.0;
MODES.day.fogD = 2.4e-5; MODES.gold.fogD = 3.4e-5; MODES.dusk.fogD = 5.2e-5;   // haze over the real land (exponential, see 27_ratscher)
const ADAPT = { k: 1 };
function houseAt(x, y, feet) { const g = window.GEO; if (!g || !g.OG || SV.on.value < 0.5) return false;
  return feet < g.zC && x > g.OG.x0 && x < g.OG.x1 && y > g.OG.y0 && y < g.OG.y1 && (feet >= g.zE - 0.3 || (x > 0 && x < 4 && y > 0 && y < 4)); }
function adaptExposure(dt, snap, pos) { const M = MODES[MODE]; if (!M) return;
  const ins = pos ? houseAt(pos[0], pos[1], pos[2]) : (typeof P !== 'undefined' && P.mode === 'walk' && houseAt(P.x, P.y, P.feet));
  const want = ins ? (M.expIn || 1) : 1;
  if (snap || Math.abs(ADAPT.k - want) < 0.004) ADAPT.k = want; else { ADAPT.k += (want - ADAPT.k) * Math.min(1, dt * 1.6); markDirty(); }
  R.toneMappingExposure = M.exp * (+QS.get('ex') || 1) * (QS.get('noadapt') ? 1 : ADAPT.k); }
const screenMats = [];
// V16a: 'auto' (the day after the game clock) and 'night' (a fixed moonlit night) are run by DN (time/daynight.js); the three fixed moods stay as they were
function setMode(m) { if (m === 'auto' || m === 'night') { if (window.DN) DN.enable(m); return; } const M = MODES[m]; if (!M) return; if (window.DN) DN.disable(); MODE = m; window.MODE_NOW = m; const L = window.LIGHTS;
  const topV = typeof P !== 'undefined' && P.mode === 'top'; sunDir = topV ? dirFromAz(205, 52) : dirFromAz(M.az, M.el); sun.intensity = topV ? 3.3 : M.sun; sun.color.set(topV ? 0xfff4e6 : M.sunC); hemi.intensity = M.hemi; scene.environmentIntensity = M.env;
  skyU.zen.value.set(M.zen); skyU.hor.value.set(M.hor); skyU.glowK.value = M.glowK; skyU.cloudK.value = M.cloud; skyU.cloudCol.value.set(M.cc); skyU.cloudShade.value.set(M.cs); scene.fog.color.set(M.fog);
  adaptExposure(0, true); L.forEach((l, i) => l.intensity = M.L[i]); glowMat.color.set(M.stove); MAT.paper.emissiveIntensity = M.paper; MAT.paperOG.emissiveIntensity = M.paper;
  if (window.FIELDU) FIELDU.uCloudK.value = ({ day: 0.42, gold: 0.18, dusk: 0 })[m] || 0;
  if (scene.fog && scene.fog.isFogExp2) scene.fog.density = (typeof P !== 'undefined' && P.mode === 'top') ? 0 : M.fogD || 3e-5;
  skyU.sunDir.value.copy(sunDir); placeSun(); setEnvFor(m); setSkyFor(m); if (window.giApply) giApply(); if (window.LIGHTSTATE) LIGHTSTATE.reset();
  if (window.RATSCHER && RATSCHER.top) RATSCHER.topMode(true); markDirty(true); }
