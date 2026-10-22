// ---- where am I (place label, indoor acoustics) ----
function inPolyXY(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      q = poly[j];
    if (a[1] > y !== q[1] > y && x < ((q[0] - a[0]) * (y - a[1])) / (q[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
window.insideSite = (x, y, z) => INSIDE.some(i => z >= i.z0 && z <= i.z1 && inLocal(i.b, x, y, i.hx, i.hy, i.ox, i.oy));
window.sitePlace = (x, y, z) => {
  for (const i of INSIDE) if (z >= i.z0 && z <= i.z1 && inLocal(i.b, x, y, i.hx, i.hy, i.ox, i.oy)) return i.name;
  const cp = BLD.carport;
  if (inLocal(cp, x, y, cp.L / 2, cp.W / 2)) return 'Carport';
  const pd = window.NPC_PAD;
  if (pd && x > pd.x0 - 0.2 && x < pd.x1 + 0.2 && y > pd.y0 - 0.2 && y < pd.y1 + 0.2) return 'Ziegenweide';
  if (window.STREAM) {
    if (STREAM.onBridge(x, y)) return z < -0.4 ? 'Unter der Brücke' : 'Brücke über den Bach';
    const a = STREAM.across(x, y);
    if (Math.abs(a) < STREAM.WT) {
      const [t] = STREAM.loc(x, y);
      if (a > 0.5 && STREAM.STAIRS.some(s => Math.abs(t - s.t) < STREAM.SW + 0.1)) return 'Treppe zum Bach';
      return Math.abs(a) < STREAM.WW ? 'Im Bach' : 'Am Bach';
    }
  }
  const [p1, p2] = S0.path;
  const dx = p2[0] - p1[0],
    dy = p2[1] - p1[1],
    L = Math.hypot(dx, dy);
  const t = ((x - p1[0]) * dx + (y - p1[1]) * dy) / L;
  const px = p1[0] + (dx / L) * t,
    py = p1[1] + (dy / L) * t;
  if (Math.hypot(x - px, y - py) < 1.8 && t > -5 && t < L + 5) return 'Feldweg';
  if (!inPolyXY(x, y, S0.garden)) return x < 2 ? 'Nachbargrundstück West' : 'Nachbargrundstück Ost';
  return null;
};
