// ---------------- the neighbours keep hours: from 22:00 to 6:00 Hubert and Ronald are at home (they come and go when nobody looks) ----------------
window.TICKS.push(
  (() => {
    let acc = 0;
    return dt => {
      acc += dt;
      if (acc < 1) return;
      acc = 0;
      const N = window.NPC;
      if (!N || !N.NPCS || typeof P === 'undefined') return;
      const real = N.real,
        loading = real && real.started && !real.ready && !real.failed,
        m = ((CLOCK.t % 1440) + 1440) % 1440,
        home = m >= 22 * 60 || m < 6 * 60;
      for (const w of [N.NPCS.hubert, N.NPCS.ronald]) {
        if (!w || !w.fig) continue;
        const g = w.fig.g,
          d = w.dist(),
          seen = P.mode !== 'walk' || (d < 45 && inView(w.x, w.y, 1.2));
        if (home && !w.away && !w.talking && !w.drive && !seen && d > 10) w.away = true;
        else if (!home && w.away && !seen) {
          w.away = false;
          if (!loading) {
            g.visible = true;
            markDirty();
          }
        }
        if (w.away && g.visible) {
          g.visible = false;
          markDirty();
        }
      }
    };
  })()
);
