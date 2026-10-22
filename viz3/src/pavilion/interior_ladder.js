// ############################ VARIANT B: furnishing around the ladder stairs ############################
varOn('B');
phase(PHN.furniture);
// EG: reading chair in front of stove and west window (the ladder takes the SE corner), lamp table towards the entrance, pouf in front, plant between daybed and ladder
grpItem('rug', 'Teppich', () =>
  B(1.0, 2.85, 1.42, 2.82, zF, zF + 0.012, MAT.rugP, { col: false, cast: false, grain: 'x' })
);
placeGLB('armchair', { x: 2.2, y: 1.95, z: zF, face: -120, h: 1.0, mat: pillowFix(0xcdbfa9) }, () =>
  armchair(1.78, 2.62, 1.55, 2.38, zF)
);
placeGLB('side_table', { x: 2.52, y: 2.48, z: zF, face: 15, h: 0.55 }, () => {
  cyl(2.52, 2.48, zF, zF + 0.49, 0.03, MAT.furnP, 12);
  cyl(2.52, 2.48, zF + 0.49, zF + 0.52, 0.21, MAT.furnP, 36);
});
placeGLB('lantern_t', { x: 2.54, y: 2.5, z: zF + 0.55, h: 0.36, col: false });
placeGLB('footstool', { x: 1.66, y: 2.27, z: zF, face: 30, h: 0.28 });
placeGLB('plant_b', { x: 2.64, y: 0.6, z: zF, h: 1.1 });
// coat rail with hooks on the north wall between bookcase and front door
phase(PHN.builtins);
grpItem('coatrail', 'Garderobe', () => {
  B(3.27, 3.69, NW - 0.025, NW, 1.72, 1.8, MAT.furnP, { col: false, bevel: 0.003 });
  for (let x = 3.33; x < 3.66; x += 0.075)
    beam([x, NW - 0.03, 1.75], [x, NW - 0.09, 1.79], 0.012, 0.012, MAT.blacksteel, { cast: false });
});
// OG: amp beside the piano (west), sideboard with record player and speakers on the north wall east of the piano
grpItem('amp', 'Verstärker', () => amp(1.12, 1.52));
grpItem('sideboard', 'Sideboard mit Plattenspieler', () => {
  B(3.02, 4.56, IY1 - 0.44, IY1, zO, zO + 0.62, MAT.furnP, { bevel: 0.004, grain: 'x' });
  B(3.02, 4.56, IY1 - 0.44, IY1, zO + 0.62, zO + 0.65, MAT.furnP, { col: false, bevel: 0.003 });
  for (const x of [3.53, 4.05])
    B(x - 0.006, x + 0.006, IY1 - 0.445, IY1 - 0.43, zO + 0.02, zO + 0.62, MAT.black, { col: false });
  phase(PHN.furniture);
  {
    const y = IY1 - 0.22;
    B(3.38, 3.73, y - 0.18, y + 0.18, zO + 0.65, zO + 0.75, MAT.furnP, { col: false, bevel: 0.004 });
    cyl(3.555, y, zO + 0.75, zO + 0.765, 0.15, MAT.black, 32, undefined, { col: false });
    for (const x of [3.13, 4.44])
      B(x - 0.1, x + 0.1, y - 0.12, y + 0.12, zO + 0.65, zO + 1.0, MAT.black, { col: false, bevel: 0.01 });
  }
});
placeGLB('plant_a', { x: 4.04, y: IY1 - 0.24, z: zO + 0.65, h: 0.7, col: false });
placeGLB('ukulele', { x: IX1B - 0.03, y: 4.0, z: zO + 1.05, face: -90, h: 0.6, col: false });
beam([IX1B + 0.01, 4.0, zO + 1.62], [IX1B - 0.05, 4.0, zO + 1.62], 0.012, 0.012, MAT.blacksteel, { cast: false });
terraceSet(zDb, RFB);
// lamps: small Akari pendant over the entrance and the foot of the ladder, paper wall lamp at the roof ladder
phase(PHN.builtins);
lantern(3.3, 2.8, zE - 0.2, 0.15, 0.9);
beam([3.3, 2.8, zE - 0.065], [3.3, 2.8, zE + 0.24], 0.004, 0.004, MAT.black, { cast: false });
{
  const x = IX1B - 0.17,
    y = 2.12,
    z = zO + 1.95;
  B(IX1B - 0.1, IX1B, y - 0.02, y + 0.02, z + 0.05, z + 0.09, MAT.blacksteel, { col: false, cast: false });
  cyl(x, y, z - 0.11, z + 0.11, 0.075, MAT.paperOG, 20, undefined, { col: false, cast: false });
}
varOff();
phase(null);
