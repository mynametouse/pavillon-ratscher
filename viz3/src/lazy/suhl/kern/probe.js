// Suhl runtime: the checks of the first day (docs/features/suhl.md „Prüfungen am ersten Tag“), kept for the test `suhl:tag1`.
// (a) the package got three.js, KERN, WELT … from the registration module and its module worker answers;
// (c) precision 13 km from the model origin: two ladders of 2 mm bars at the same place, one with absolute model coordinates in its
//     vertex buffer, one with a local origin (mesh.position at the place, small numbers in the buffer) – looked at from 12 cm.
export function probe(ctx, worker) {
  const { THREE, scene } = ctx,
    made = [];
  return {
    // what arrived in the package
    handed: () => ({
      three: THREE.REVISION,
      sameThree: THREE === window.THREE,
      kern: typeof ctx.KERN.zone === 'function' && ctx.KERN === window.KERN,
      welt: ctx.WELT === window.WELT && !!ctx.WELT.on,
      village: !!ctx.VILLAGE && ctx.VILLAGE === window.VILLAGE,
      scene: !!scene.isScene,
      trees: Object.keys(ctx.TREES || {}).length,
      veh: !!ctx.VEH,
    }),
    // the worker: a typed array there and back (transferred), a fetch from the worker, where it runs
    worker: url => worker.ask({ op: 'ping', a: new Float32Array([1, 2, 3.5]), url }),
    // the two ladders at (x, y, z); returns where the camera should stand and the two rows to read
    ladders(x, y, z) {
      const N = 40,
        w = 0.002,
        h = 0.03,
        mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false, toneMapped: false }),
        back = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, fog: false, toneMapped: false });
      const mk = (ox, oy, oz, dz) => {
        const pos = [];
        for (let i = 0; i < N; i++) {
          const x0 = ox + i * 2 * w,
            x1 = x0 + w,
            z0 = oz + dz,
            z1 = z0 + h;
          // three.js axes: (x, z, -y)
          pos.push(x0, z0, -oy, x1, z0, -oy, x1, z1, -oy, x0, z0, -oy, x1, z1, -oy, x0, z1, -oy);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        return g;
      };
      const abs = new THREE.Mesh(mk(x, y, z, 0), mat), // absolute coordinates in the buffer
        lok = new THREE.Mesh(mk(0, 0, 0, h + 0.006), mat); // local origin: the place in mesh.position
      lok.position.set(x, z, -y);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), back);
      bg.position.set(x + N * w, z + h, -(y + 0.02));
      for (const m of [abs, lok, bg]) {
        m.frustumCulled = false;
        m.userData.noMerge = true;
        scene.add(m);
        made.push(m);
      }
      return {
        cam: [x + N * w, y - 0.12, z + h + 0.003],
        rows: { abs: [x + N * w, y, z + h / 2], lok: [x + N * w, y, z + h + 0.006 + h / 2] },
        n: N,
        w,
      };
    },
    clear() {
      for (const m of made.splice(0)) {
        scene.remove(m);
        m.geometry.dispose();
      }
    },
  };
}
