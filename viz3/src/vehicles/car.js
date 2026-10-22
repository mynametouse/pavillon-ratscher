// ===================== V16b the car (V16b2: as a station wagon): a generic estate in the size of a 2012 Logan MCV (4.47 × 1.74 × 1.64 m), colour "Beige Sable" metallic =====================
// No makers' marks or design details: a plain estate with the owner's car's proportions (wheelbase 2.905 m, track 1.47 m, overhangs
// 0.80/0.77 m, 185/65 R15), long roof with rails, third side window, large load space behind split rear doors (later: boards and logs).
// Body: the side profile with the wheel arches extruded across the width (bevelled edges), bent afterwards (tumblehome, rounded ends);
// the cabin floor lies low between the front and rear sections, the doors are separate panels, so the interior shows through the glass.
// Glasshouse: windscreen, side and rear windows as one tapered prism of tinted glass, roof, pillars and frames over it. Inside: dashboard,
// steering wheel, seats, rear bench, load floor. Model frame: x right, y forward, z up, origin on the ground under the centre of mass
// (front axle +1.25 m, rear axle −1.655 m). Number plates: "HBN" (Landkreis Hildburghausen) with a made-up number.
const CAR = (() => {
  const A = 1.25,
    B = 1.655,
    TR = 1.468,
    RW = 0.31,
    HW = 0.87,
    YF = 2.047,
    YR = -2.426,
    D = A - 1.05; // D: the front part as on the saloon, moved forward with the axle
  const P = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#A89F88'),
    metalness: 0.55,
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    envMapIntensity: 1.0,
  });
  const M = {
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x161c1f,
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.58,
      envMapIntensity: 1.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    black: new THREE.MeshStandardMaterial({ color: 0x18191a, roughness: 0.62 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc9ccce, metalness: 1, roughness: 0.16 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xaeb2b5, metalness: 0.65, roughness: 0.32 }),
    hub: new THREE.MeshStandardMaterial({ color: 0x3b3e41, metalness: 0.5, roughness: 0.5 }),
    dash: new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.78 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x34373c, roughness: 0.95 }),
    liner: new THREE.MeshStandardMaterial({ color: 0xb4b0a8, roughness: 0.95 }),
    carpet: new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 1 }),
    under: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 1, side: THREE.DoubleSide }),
    head: new THREE.MeshStandardMaterial({
      color: 0xd9dee2,
      metalness: 0.3,
      roughness: 0.12,
      emissive: 0xfff2d6,
      emissiveIntensity: 0,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0x6d0a0a,
      roughness: 0.25,
      emissive: 0xff1a0c,
      emissiveIntensity: 0,
    }),
    brake: new THREE.MeshStandardMaterial({
      color: 0x7a0c0c,
      roughness: 0.25,
      emissive: 0xff1608,
      emissiveIntensity: 0,
    }),
    rev: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xc8701a, roughness: 0.3 }),
  };
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const add = (geo, mat, par = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    par.add(m);
    return m;
  };
  // a box in the model frame: size (x width, y length, z height) at centre (x, y, z), turned about x (rx) and z (rz)
  const bx = (sx, sy, sz, mat, x, y, z, rx = 0, rz = 0, par = body) => {
    const m = add(new THREE.BoxGeometry(sx, sz, sy), mat, par);
    m.position.copy(V(x, y, z));
    m.rotation.set(rx, rz, 0, 'YXZ');
    return m;
  };
  const smooth = (a, b, t) => {
    const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  // ---- an outline in the side view (y forward, z up) extruded across the width (x), then bent ----
  function extrude(pts, width, bevel, bend) {
    const sh = new THREE.Shape();
    pts.forEach(([y, z], i) => (i ? sh.lineTo(y, z) : sh.moveTo(y, z)));
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: width - 2 * bevel,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: -bevel,
      bevelSegments: 3,
      curveSegments: 10,
    });
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getX(i),
        z = p.getY(i),
        x = p.getZ(i) - (width - 2 * bevel) / 2;
      const [nx, ny, nz] = bend ? bend(x, y, z) : [x, y, z];
      p.setXYZ(i, nx, nz, -ny);
    }
    geo.computeVertexNormals();
    return geo;
  }
  // the wheel arches: a half circle above the axle
  const arch = (yc, r, z0, from) => {
    const out = [];
    for (let k = 0; k <= 12; k++) {
      const a = (Math.PI * k) / 12,
        s = from > 0 ? a : Math.PI - a;
      out.push([yc + Math.cos(s) * r, z0 + Math.sin(s) * r]);
    }
    return out;
  };
  const AR = 0.39,
    AZ = 0.315;
  // body sides lean in towards the roof and the sill; the plan rounds off at both ends
  const bendBody = (x, y, z) => {
    const ends = 1 - 0.075 * smooth(0.74, 1.0, Math.abs(y - (YF + YR) / 2) / ((YF - YR) / 2)),
      low = 1 - 0.04 * smooth(0.62, 0.25, z),
      high = 1 - 0.03 * smooth(0.9, 1.08, z);
    return [x * ends * low * high, y, z + 0.012 * (1 - (x / HW) ** 2) * smooth(0.82, 0.97, z)];
  };
  // lower body: front section (bumper, wing, bonnet, firewall), the cabin floor, the rear section up to the window line (load space walls,
  // the split rear doors' lower part, bumper); arches cut out
  const prof = [
    [1.8 + D, 0.25],
    [1.865 + D, 0.36],
    [1.875 + D, 0.58],
    [1.85 + D, 0.74],
    [1.7 + D, 0.82],
    [1.3 + D, 0.885],
    [0.9 + D, 0.93],
    [0.66 + D, 0.955],
    [0.58 + D, 0.955],
    [0.58 + D, 0.44],
    [-1.37, 0.44],
    [-1.37, 1.0],
    [-2.3, 1.02],
    [-2.345, 0.99],
    [-2.385, 0.75],
    [-2.425, 0.48],
    [-2.4, 0.27],
    [-2.1, 0.25],
    ...arch(-B, AR, AZ, -1),
    [-1.2, 0.24],
    [0.7, 0.24],
    ...arch(A, AR, AZ, -1),
    [1.55 + D, 0.26],
  ];
  const lower = add(extrude(prof, 2 * HW, 0.07, bendBody), P);
  // doors: front 0.75 … −0.40, rear −0.40 … −1.37; outer skin and inner trim; the gaps as dark lines
  for (const sx of [-1, 1]) {
    const skin = add(
      extrude(
        [
          [0.55 + D, 0.26],
          [0.55 + D, 0.955],
          [-1.37, 0.995],
          [-1.37, 0.26],
        ],
        0.05,
        0.012,
        (x, y, z) => {
          const [bx_, by, bz] = bendBody(sx * (HW - 0.03) + x, y, z);
          return [bx_, by, bz];
        }
      ),
      P
    );
    const trimP = add(
      extrude(
        [
          [0.52 + D, 0.42],
          [0.52 + D, 0.94],
          [-1.35, 0.975],
          [-1.35, 0.42],
        ],
        0.04,
        0,
        (x, y, z) => [sx * (HW - 0.09) + x, y, z]
      ),
      M.dash
    );
    for (const yy of [0.552 + D, -0.4, -1.368]) bx(0.012, 0.012, 0.69, M.trim, sx * (HW + 0.002), yy, 0.61);
    bx(0.03, 0.17, 0.035, M.black, sx * (HW + 0.004), 0.22, 0.86);
    bx(0.03, 0.17, 0.035, M.black, sx * (HW + 0.004), -1.18, 0.875); // door handles
    bx(0.02, 2.6, 0.05, M.black, sx * (HW - 0.01), -0.3, 0.3); // sill trim
    bx(0.02, 0.95, 0.06, M.black, sx * (HW - 0.005), -0.89, 0.62); // protective strip on the rear door … and the front door
    bx(0.02, 1.0, 0.06, M.black, sx * (HW - 0.005), 0.18, 0.62);
    // mirror on its arm
    const mg = new THREE.Group();
    mg.position.copy(V(sx * (HW + 0.05), 0.47 + D, 1.02));
    body.add(mg);
    bx(0.12, 0.08, 0.05, M.black, sx * -0.04, 0, -0.03, 0, 0, mg);
    bx(0.07, 0.11, 0.13, P, sx * 0.04, 0, 0.02, 0, 0, mg);
    bx(0.005, 0.02, 0.1, M.chrome, sx * 0.04, -0.056, 0.02, 0, 0, mg);
  }
  // ---- glasshouse: a tapered prism of tinted glass (windscreen, three side windows a side, the rear doors' windows), roof, pillars ----
  const BL = { yf: 0.62 + D, yr: -2.33, z: 0.97, w: 0.8 },
    RF = { yf: -0.05, yr: -2.3, z: 1.55, w: 0.64 };
  {
    const gq = [];
    const c = [
      [-BL.w, BL.yf, BL.z],
      [BL.w, BL.yf, BL.z],
      [BL.w * 0.97, BL.yr, BL.z + 0.05],
      [-BL.w * 0.97, BL.yr, BL.z + 0.05],
      [-RF.w, RF.yf, RF.z],
      [RF.w, RF.yf, RF.z],
      [RF.w, RF.yr, RF.z - 0.01],
      [-RF.w, RF.yr, RF.z - 0.01],
    ];
    const quad = (a, b, cc, d) => {
      for (const k of [a, b, cc, a, cc, d]) {
        const q = c[k];
        gq.push(q[0] * 0.995, q[2], -q[1]);
      }
    };
    quad(0, 1, 5, 4);
    quad(2, 3, 7, 6);
    quad(1, 2, 6, 5);
    quad(3, 0, 4, 7);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(gq, 3));
    geo.computeVertexNormals();
    const gm = add(geo, M.glass);
    gm.castShadow = false;
    gm.renderOrder = 2;
    // roof panel (slightly crowned, running out over the rear doors) and the headliner under it; roof rails on feet
    const roofPts = [
      [RF.yf + 0.05, RF.z],
      [RF.yf - 0.02, RF.z + 0.035],
      [RF.yr + 0.06, RF.z + 0.032],
      [RF.yr - 0.06, RF.z + 0.005],
      [RF.yr - 0.08, RF.z - 0.02],
    ];
    add(
      extrude(
        roofPts.concat([
          [RF.yr - 0.08, RF.z - 0.035],
          [RF.yf + 0.05, RF.z - 0.02],
        ]),
        2 * RF.w + 0.06,
        0.02,
        (x, y, z) => [x, y, z + 0.02 * (1 - (x / RF.w) ** 2)]
      ),
      P
    );
    bx(2 * RF.w - 0.04, RF.yf - RF.yr - 0.08, 0.02, M.liner, 0, (RF.yf + RF.yr) / 2, RF.z - 0.04);
    for (const sx of [-1, 1]) {
      bx(0.035, 1.95, 0.03, M.black, sx * (RF.w - 0.06), -1.25, RF.z + 0.075);
      for (const yy of [-0.3, -2.18]) bx(0.05, 0.14, 0.05, M.black, sx * (RF.w - 0.06), yy, RF.z + 0.048);
    } // low roof rails on two feet
    // pillars: A along the windscreen edges, B and C dark between the windows, D wide in the body colour at the rear corners
    const strut = (a, b, w, d, mat) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        dz = b[2] - a[2],
        L = Math.hypot(dx, dy, dz);
      const m = add(new THREE.BoxGeometry(w, L, d), mat);
      m.position.copy(V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dx, dy, dz).normalize());
      return m;
    };
    const wAt = (y, z) => {
      const k = (z - BL.z) / (RF.z - BL.z);
      return BL.w + (RF.w - BL.w) * k;
    };
    for (const sx of [-1, 1]) {
      strut([sx * (BL.w + 0.005), BL.yf - 0.02, BL.z], [sx * (RF.w + 0.012), RF.yf - 0.01, RF.z], 0.07, 0.09, P);
      for (const yb of [-0.4, -1.4])
        strut(
          [sx * (wAt(yb, BL.z + 0.02) + 0.012), yb, BL.z + 0.02],
          [sx * (RF.w + 0.014), yb - 0.04, RF.z - 0.005],
          yb < -1 ? 0.07 : 0.04,
          0.08,
          M.trim
        );
      // D pillar: a painted panel over the glass at the rear corner
      const cp = [];
      const pts = [
        [BL.yr + 0.01, BL.z + 0.05],
        [-2.12, BL.z + 0.045],
        [-2.14, RF.z - 0.012],
        [RF.yr - 0.005, RF.z - 0.012],
      ];
      const xz = (y, z) => sx * (wAt(y, z) * (1 - 0.03 * Math.max(0, (-2.12 - y) / 0.2)) + 0.012);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const q = pts[k];
        cp.push(xz(q[0], q[1]), q[1], -q[0]);
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      cg.computeVertexNormals();
      add(
        cg,
        new THREE.MeshPhysicalMaterial({
          color: P.color,
          metalness: P.metalness,
          roughness: P.roughness,
          clearcoat: 1,
          clearcoatRoughness: 0.07,
          side: THREE.DoubleSide,
        })
      );
      strut(
        [sx * (BL.w + 0.01), BL.yf, BL.z + 0.005],
        [sx * (BL.w * 0.97 + 0.01), -2.12, BL.z + 0.045],
        0.025,
        0.03,
        M.trim
      ); // window sill strip
      strut(
        [sx * (RF.w + 0.014), RF.yf, RF.z - 0.008],
        [sx * (RF.w + 0.014), RF.yr, RF.z - 0.018],
        0.025,
        0.035,
        M.trim
      );
    } // roof frame
    strut([-BL.w, BL.yf + 0.01, BL.z + 0.002], [BL.w, BL.yf + 0.01, BL.z + 0.002], 0.04, 0.03, M.trim); // windscreen foot
    // rear: the split of the two side-hinged rear doors (the wider one on the left) and their frames over the glass
    bx(0.03, 0.02, 0.58, M.trim, 0.16, -2.338, 1.28);
    bx(0.012, 0.02, 0.5, M.trim, 0.16, -2.39, 0.73);
    bx(1.42, 0.02, 0.035, M.trim, 0, -2.338, BL.z + 0.06);
    bx(1.25, 0.02, 0.03, M.trim, 0, -2.31, RF.z - 0.02);
  }
  const plate = (() => {
    const c = document.createElement('canvas');
    c.width = 520;
    c.height = 112;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f0';
    x.fillRect(0, 0, 520, 112);
    x.strokeStyle = '#111';
    x.lineWidth = 5;
    x.strokeRect(3, 3, 514, 106);
    x.fillStyle = '#1d3f9a';
    x.fillRect(6, 6, 46, 100);
    x.fillStyle = '#f2d21e';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.arc(29 + Math.cos(a) * 13, 34 + Math.sin(a) * 13, 2.2, 0, 7);
      x.fill();
    }
    x.fillStyle = '#fff';
    x.font = 'bold 26px sans-serif';
    x.textAlign = 'center';
    x.fillText('D', 29, 92);
    x.fillStyle = '#111';
    x.font = 'bold 74px "DIN Alternate", "Arial Narrow", Arial, sans-serif';
    x.textAlign = 'left';
    x.fillText('HBN PR 216', 64, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 });
  })();
  // the front face of the body where the parts sit (measured on the extruded body, so they never end up inside it)
  // (the extruded faces have vertices only along their edges, so every vertex in the height band counts; the plan is not bent lengthwise)
  const frontAt = (z0, z1, dflt) => {
    const pp = lower.geometry.attributes.position;
    let m = -9;
    for (let i = 0; i < pp.count; i++) {
      const z = pp.getY(i);
      if (z >= z0 && z <= z1) m = Math.max(m, -pp.getZ(i));
    }
    return m > 0 ? m : dflt;
  };
  const FL = frontAt(0.62, 0.78, 1.85 + D),
    FB = frontAt(0.36, 0.56, 1.87 + D);
  // grille: a dark trapezoid frame with three horizontal slats and a bright top bar (no badge)
  bx(0.95, 0.05, 0.15, M.black, 0, FL - 0.005, 0.675);
  for (const z of [0.63, 0.672, 0.714]) bx(0.86, 0.02, 0.02, M.trim, 0, FL + 0.021, z);
  bx(0.94, 0.02, 0.016, M.chrome, 0, FL + 0.018, 0.752);
  // headlamps drawn back into the wings, a chrome reflector in each, indicators at the outer ends
  for (const sx of [-1, 1]) {
    const hl = bx(0.34, 0.06, 0.16, M.head, sx * 0.61, FL - 0.03, 0.705);
    hl.rotation.y = sx * 0.2;
    const rf = add(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20), M.chrome);
    rf.rotation.x = Math.PI / 2;
    rf.position.copy(V(sx * 0.57, FL + 0.0, 0.705));
    bx(0.08, 0.04, 0.05, M.amber, sx * 0.8, FL - 0.11, 0.725);
  }
  // bumper: wide black intake, round fog lamps in black surrounds, the number plate
  bx(0.74, 0.05, 0.1, M.black, 0, FB + 0.0, 0.4);
  bx(0.52, 0.012, 0.112, plate, 0, FB + 0.03, 0.52);
  for (const sx of [-1, 1]) {
    bx(0.15, 0.04, 0.12, M.black, sx * 0.62, FB - 0.005, 0.405);
    const fg = add(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 20), M.head);
    fg.rotation.x = Math.PI / 2;
    fg.position.copy(V(sx * 0.62, FB + 0.012, 0.405));
  }
  // ---- rear: tall lamps up the D pillars (tail, brake, reversing, indicator), handle at the split, plate, bumper, exhaust ----
  const tails = [],
    brakes = [],
    revs = [];
  for (const sx of [-1, 1]) {
    tails.push(bx(0.13, 0.05, 0.3, M.tail, sx * 0.745, -2.335, 1.12));
    brakes.push(bx(0.13, 0.05, 0.15, M.brake, sx * 0.745, -2.36, 0.89));
    bx(0.13, 0.05, 0.09, M.amber, sx * 0.745, -2.375, 0.77);
    revs.push(bx(0.11, 0.05, 0.06, M.rev, sx * 0.745, -2.385, 0.68));
  }
  bx(0.52, 0.012, 0.112, plate, -0.2, -2.405, 0.62);
  bx(0.03, 0.04, 0.14, M.black, 0.13, -2.37, 0.86);
  bx(1.5, 0.05, 0.09, M.black, 0, YR + 0.02, 0.36);
  {
    const ex = add(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), M.hub);
    ex.rotation.x = Math.PI / 2;
    ex.position.copy(V(-0.45, YR + 0.07, 0.26));
  }
  // underbody: dark, so no sky shows under the car
  bx(1.62, 4.1, 0.02, M.under, 0, (YF + YR) / 2, 0.24);
  // ---- inside: floor, dashboard with cluster, steering wheel, seats, rear bench, gear lever, the load space behind ----
  bx(1.62, 1.92, 0.02, M.carpet, 0, -0.41 + D * 0.5, 0.45);
  bx(1.5, 0.95, 0.02, M.carpet, 0, -1.86, 0.62);
  bx(1.5, 0.02, 0.18, M.carpet, 0, -1.4, 0.53); // load floor at sill height and its step
  bx(1.58, 0.36, 0.2, M.dash, 0, 0.42 + D, 0.81);
  bx(1.56, 0.32, 0.05, M.dash, 0, 0.45 + D, 0.925, -0.22);
  bx(0.4, 0.12, 0.07, M.dash, -0.36, 0.36 + D, 0.955);
  bx(0.28, 0.3, 0.3, M.dash, 0, 0.3 + D, 0.6);
  const sw = new THREE.Group();
  sw.position.copy(V(-0.36, 0.19 + D, 0.925));
  sw.rotation.x = -0.45;
  body.add(sw);
  {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.016, 8, 32), M.trim);
    sw.add(rim);
    for (const a of [0, 2.1, 4.2]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.02), M.dash);
      sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0);
      sp.rotation.z = a;
      sw.add(sp);
    }
    const hubM = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 16), M.dash);
    hubM.rotation.x = Math.PI / 2;
    sw.add(hubM);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.36, 10), M.dash);
    col.position.set(0, -0.03, -0.18);
    col.rotation.x = Math.PI / 2;
    sw.add(col);
  }
  for (const sx of [-1, 1]) {
    bx(0.5, 0.52, 0.12, M.seat, sx * 0.36, -0.38 + D, 0.62);
    bx(0.5, 0.12, 0.62, M.seat, sx * 0.36, -0.7 + D, 0.95, 0.2);
    bx(0.28, 0.1, 0.16, M.seat, sx * 0.36, -0.78 + D, 1.32, 0.2);
  }
  bx(1.36, 0.5, 0.14, M.seat, 0, -1.0, 0.6);
  bx(1.36, 0.12, 0.55, M.seat, 0, -1.25, 0.9, 0.12);
  bx(0.05, 0.05, 0.16, M.trim, 0.0, 0.08 + D, 0.6);
  // ---- wheels: tyre (lathe), steel rim with a plain hub cap, on a steering pivot and a rolling node ----
  const tyreGeo = (() => {
    const r = RW,
      w = 0.185,
      ri = 0.2,
      s = 0.035,
      pts = [
        [ri, -w / 2],
        [r - s, -w / 2],
        [r, -w / 2 + s],
        [r, w / 2 - s],
        [r - s, w / 2],
        [ri, w / 2],
      ].map(([a, b]) => new THREE.Vector2(a, b));
    const gg = new THREE.LatheGeometry(pts, 32);
    gg.rotateZ(Math.PI / 2);
    return gg;
  })();
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.17, 28);
  rimGeo.rotateZ(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.165, 0.175, 0.02, 28);
  capGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [x, y, steer, drive] of [
    [-TR / 2, A, 1, 1],
    [TR / 2, A, 1, 1],
    [-TR / 2, -B, 0, 0],
    [TR / 2, -B, 0, 0],
  ]) {
    const piv = new THREE.Group(),
      node = new THREE.Group();
    piv.position.copy(V(x, y, RW));
    piv.add(node);
    g.add(piv);
    const t = new THREE.Mesh(tyreGeo, M.tyre),
      rm = new THREE.Mesh(rimGeo, M.hub),
      cp = new THREE.Mesh(capGeo, M.rim);
    cp.position.x = Math.sign(x) * 0.086;
    node.add(t, rm, cp);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2,
        d = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.022), M.hub);
      d.position.set(Math.sign(x) * 0.097, Math.cos(a) * 0.11, Math.sin(a) * 0.11);
      d.rotation.x = a;
      node.add(d);
    }
    for (const m of [t, rm, cp]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    wheels.push({ x, y, r: RW, w: 0.185, steer, drive, piv, node });
  }
  const model = {
    g,
    body,
    wheels,
    lamps: { head: [M.head], tail: [M.tail], brake: [M.brake], rev: [M.rev] },
    beam: [0, YF - 0.12, 0.7],
    cargo: { y0: -2.33, y1: -1.42, z: 0.63, hw: 0.68, h: 0.88 },
  }; // the load space (V16d)
  const spec = {
    id: 'car',
    name: 'Auto',
    enterLabel: 'Ins Auto steigen',
    mass: 1230,
    Iz: 2150,
    a: A,
    b: B,
    track: TR,
    hcg: 0.57,
    rw: RW,
    mu: 1.0,
    Cf: 74000,
    Cr: 86000,
    steerMax: 0.56,
    steerV: 15,
    steerRate: 2.6,
    steerBack: 4.2,
    eng: {
      idle: 850,
      red: 6300,
      launch: 2300,
      drag: 32,
      curve: [
        [800, 70],
        [1500, 92],
        [3000, 112],
        [4500, 106],
        [5500, 95],
        [6300, 82],
        [6600, 0],
      ],
    },
    gears: [3.727, 2.048, 1.393, 1.029, 0.756],
    rev: 3.545,
    final: 4.5,
    eff: 0.9,
    split: 1,
    shift: 0.32,
    upAt: t => 2300 + 3600 * t,
    downAt: t => 1250 + 1500 * t,
    brake: 10500,
    brakeF: 0.66,
    hand: true,
    cdA: 0.76,
    dive: 0.004,
    lean: 0.006,
    travel: 0.09,
    susp: 70,
    suspD: 14,
    box: { hw: 0.88, hl: (YF - YR) / 2, cy: (YF + YR) / 2, h: 1.62 },
    eye: [-0.36, -0.42 + D, 1.17],
    door: [-1.25, -0.25 + D],
    reach: 2.2,
    beam: 320,
    beamAngle: 0.5,
    sound: 'petrol',
    cam: { dist: 5.9, height: 2.0, look: 1.2 },
    // parked on the field path just past the garden bridge, nose towards the village (first point of the route to the Klinge)
    // (on the field side, 2.5 m left of the path's middle: Günter's tractor makes its rounds along the path)
    home: () => {
      const R = ROADS.routes.klinge;
      if (R && R.length > 1) {
        const a = R[0],
          b = R[1],
          h = Math.atan2(b[0] - a[0], b[1] - a[1]);
        return [a[0] - Math.cos(h) * 2.5, a[1] + Math.sin(h) * 2.5, h];
      }
      return [8.6, 33.4, 2.04];
    },
  };
  return VEH.add(spec, model);
})();
