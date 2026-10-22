// ---------------- materials (photo textures, CC0; plain colours as fallback) ----------------
const MAT = {
  char: pbrMat('char', { fallback: 0x1f1c1a, nrm: 1.0, env: 0.7, grade: true }),
  charT: pbrMat('char', { fallback: 0x1f1c1a, nrm: 1.0, env: 0.7, grade: true }), // stair tower facade (own material so its look can be chosen separately)
  larch: pbrMat('larch', { fallback: 0xc49a68, nrm: 0.8, rough: 0.78 }),
  larchIn: pbrMat('larch', { fallback: 0xd2ab7a, nrm: 0.6, env: 0.8, rough: 0.75 }),
  towerIn: pbrMat('larch', { fallback: 0xe9dfcc, nrm: 0.45, env: 0.85, rough: 0.8, wash: [0xf1ebe0, 0.62] }), // stair tower lining: white-glazed larch, keeps the narrow tower bright
  frame: pbrMat('larch', { fallback: 0x9a7048, color: 0xc9a27a, nrm: 0.5, rough: 0.6 }),
  deck: pbrMat('deck', { fallback: 0x9c8a72, nrm: 1.0, rough: 1.45 }),
  oak: pbrMat('oak', { fallback: 0xa07650, nrm: 0.7 }),
  oakF: pbrMat('larch', { fallback: 0xa98256, color: 0xc49a70, nrm: 0.4, tile: [1.2, 1.2], rough: 0.62 }),
  clay: pbrMat('clay', { fallback: 0xe6dac6, nrm: 0.5, env: 0.8, grade: true }),
  slate: pbrMat('slate', { fallback: 0x45484b, color: 0xa8a8a8, nrm: 0.8 }),
  conc: pbrMat('concrete', { fallback: 0xb2aea6, nrm: 1.0, rough: 1.4 }),
  stone: pbrMat('flagstone', { fallback: 0x8f877a, nrm: 1.0, rough: 1.4 }),
  linen: pbrMat('linen', { fallback: 0xe7decf, color: 0xf4eee4, nrm: 0.6 }),
  sage: pbrMat('linen', { fallback: 0x7d8a6f, color: 0x93a084, nrm: 0.6 }),
  rust: pbrMat('linen', { fallback: 0xa35a3c, color: 0xd07b55, nrm: 0.6 }),
  wool: pbrMat('wool', { fallback: 0x7c7266, color: 0x9a8f82, nrm: 0.7 }),
  woolLight: pbrMat('wool', { fallback: 0xd8cfc0, color: 0xfff6ea, nrm: 0.7 }),
  rug: pbrMat('wool', { fallback: 0xcdbb9a, color: 0xf0e2c8, nrm: 0.9, tile: [0.6, 0.6] }),
  blacksteel: pbrMat('blacksteel', { fallback: 0x232220, metal: 0.7, rough: 1, nrm: 0.5 }),
  fascia: pbrMat('blacksteel', { fallback: 0x1d1c1b, metal: 0.5, rough: 0.8, nrm: 0.3 }),
  epdm: plain({ color: 0x2f2e2c, roughness: 0.9 }),
  steel: plain({ color: 0xc4c8cc, metalness: 1.0, roughness: 0.28 }),
  black: plain({ color: 0x1b1a19, roughness: 0.55, metalness: 0.2 }),
  brass: plain({ color: 0xb08d57, metalness: 1.0, roughness: 0.35 }),
  alu: plain({ color: 0x8e9398, metalness: 0.9, roughness: 0.35 }),
  pvframe: plain({ color: 0x8d939a, metalness: 0.9, roughness: 0.35 }),
  paper: plain({ color: 0xf3ead8, emissive: 0xffd9a0, emissiveIntensity: 0.0, roughness: 1, side: THREE.DoubleSide }),
  paperOG: plain({ color: 0xf3ead8, emissive: 0xffd9a0, emissiveIntensity: 0.0, roughness: 1, side: THREE.DoubleSide }), // upper floor lamps: own switch (V14)
  pot: plain({ color: 0x9a7258, roughness: 0.9 }),
  soil: plain({ color: 0x5a4838, roughness: 1 }), // garden soil (albedo ~0.1)
  logs: pbrMat('bark', { fallback: 0x7a6650, color: 0xd9cbb8, nrm: 1.0, tile: [0.5, 0.5] }),
  logEnd: plain({ color: 0xc8a77c, roughness: 0.9 }),
  wall: pbrMat('plaster_ext', { fallback: 0xe2ddd2, nrm: 1.0 }),
  roofRed: pbrMat('rooftiles', { fallback: 0x8e4b3b, nrm: 1.0 }),
  roofGrey: pbrMat('roofmetal', { fallback: 0x5d5f62, metal: 0.4, rough: 1, nrm: 0.8 }),
  wood2: pbrMat('deck', { fallback: 0xa98c66, color: 0xd7c6ad, nrm: 0.8 }),
  metal: pbrMat('roofmetal', { fallback: 0x9aa0a5, metal: 0.5, rough: 1, nrm: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xeef4f6,
    transparent: true,
    opacity: 0.12,
    roughness: 0.03,
    metalness: 0,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  pv: plain({ color: 0x141c2b, roughness: 0.12, metalness: 0.3 }),
  // farm and village buildings: corrugated fibre-cement and red box-profile roofs, galvanised sheet, weathered boards, barn doors, zinc gutters
  fibre: pbrMat('fibrecement', { fallback: 0x7d7a74, nrm: 1.0, rough: 1.1 }),
  boxRed: pbrMat('boxprofile', { fallback: 0x7a2c1c, metal: 0.25, rough: 1.15, nrm: 0.9 }),
  corr: pbrMat('corrugated', { fallback: 0x9a9c9e, metal: 0.5, rough: 1.0, nrm: 1.0 }),
  barnDoor: pbrMat('barndoor', { fallback: 0x5b4032, nrm: 1.0, rough: 1.1 }),
  weather: pbrMat('weatherwood', { fallback: 0x6b6862, nrm: 1.0, rough: 1.05 }),
  zinc: plain({ color: 0x9aa1a4, metalness: 0.65, roughness: 0.42 }),
};
MAT.glass.userData.noSV = true;
// pavilion interior: own materials (live colour grading), so the interior styles do not change the other buildings
Object.assign(MAT, {
  floorP: pbrMat('oak', { fallback: 0xa07650, nrm: 0.7, grade: true }),
  ceilP: pbrMat('larch', { fallback: 0xd2ab7a, nrm: 0.6, env: 0.8, rough: 0.75, grade: true }),
  furnP: pbrMat('larch', { fallback: 0xa98256, color: 0xc49a70, nrm: 0.4, tile: [1.2, 1.2], rough: 0.62, grade: true }),
  linenP: pbrMat('linen', { fallback: 0xe7decf, color: 0xf4eee4, nrm: 0.6, grade: true }),
  sageP: pbrMat('linen', { fallback: 0x7d8a6f, color: 0x93a084, nrm: 0.6, grade: true }),
  rustP: pbrMat('linen', { fallback: 0xa35a3c, color: 0xd07b55, nrm: 0.6, grade: true }),
  woolP: pbrMat('wool', { fallback: 0x7c7266, color: 0x9a8f82, nrm: 0.7, grade: true }),
  rugP: pbrMat('wool', { fallback: 0xcdbb9a, color: 0xf0e2c8, nrm: 0.9, tile: [0.6, 0.6], grade: true }),
});
// construction materials
function osbTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a66b';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    g.save();
    g.translate(rnd() * 512, rnd() * 512);
    g.rotate(rnd() * 6.283);
    g.fillStyle =
      '#' + new THREE.Color().setHSL(0.09 + rnd() * 0.03, 0.35 + rnd() * 0.25, 0.42 + rnd() * 0.25).getHexString();
    g.globalAlpha = 0.85;
    g.fillRect(-rr(12, 40), -rr(3, 8), rr(24, 80), rr(6, 16));
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  t.repeat.set(1 / 1.25, 1 / 1.25);
  return t;
}
function fibreTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b89160';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle =
      '#' + new THREE.Color().setHSL(0.085 + rnd() * 0.02, 0.4 + rnd() * 0.2, 0.5 + rnd() * 0.25).getHexString();
    g.globalAlpha = 0.6;
    g.fillRect(rnd() * 256, rnd() * 256, rr(1, 3), rr(1, 2));
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(2, 2);
  return t;
}
Object.assign(MAT, {
  kvh: pbrMat('larch', { fallback: 0xead7b4, color: 0xf1e2c4, nrm: 0.5, rough: 0.95, env: 0.6 }),
  bsh: pbrMat('larch', { fallback: 0xf0dfbd, color: 0xf6e9cf, nrm: 0.4, rough: 0.9, env: 0.6, tile: [1.3, 0.6] }),
  osb: plain({ map: osbTex(), roughness: 0.95 }),
  hfd: plain({ map: fibreTex(), roughness: 1 }),
  hfdBoard: plain({ color: 0xc9a473, roughness: 1 }),
  xps: plain({ color: 0xb5c9c2, roughness: 0.9 }),
  bitumen: plain({ color: 0x15130f, roughness: 0.85 }),
  foil: new THREE.MeshPhysicalMaterial({
    color: 0xaac8ff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  fleece: plain({ color: 0x2d2e30, roughness: 1 }),
  galv: plain({ color: 0xaab0b4, metalness: 0.9, roughness: 0.45 }),
  plank: pbrMat('deck', { fallback: 0xb8a58a, color: 0xd9c9ad, nrm: 0.8, rough: 1.3 }),
});
MAT.foil.userData.noSV = true;
// weathering near the ground and soft patches for outdoor surfaces (see grime() in 01_assets)
grime(MAT.char, 0.38, 0.5, 0.06);
grime(MAT.charT, 0.38, 0.5, 0.06);
grime(MAT.larch, 0.42, 0.45, 0.07);
grime(MAT.kvh, 0.35, 0.4, 0.06);
grime(MAT.wall, 0.5, 0.65, 0.1, 0.12);
grime(MAT.metal, 0.45, 0.5, 0.1);
grime(MAT.corr, 0.45, 0.5, 0.1, 0.15);
grime(MAT.barnDoor, 0.4, 0.5, 0.08);
grime(MAT.weather, 0.4, 0.45, 0.08);
grime(MAT.fibre, 0, 0.1, 0.14);
grime(MAT.boxRed, 0, 0.1, 0.12);
grime(MAT.conc, 0.3, 0.3, 0.12);
grime(MAT.plank, 0.42, 0.45, 0.09);
grime(MAT.wood2, 0.4, 0.45, 0.08);
