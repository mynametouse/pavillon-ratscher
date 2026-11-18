// ===================== Suhl 1989: the night at the gate – 4/5 December 1989 at the Bezirksverwaltung of the Staatssicherheit =====================
// Falko, 17.11.2026 15:05 (clicked „Suhl 1989 für die Nacht am Tor“): the flashback of Grenzland chapter 2, mission 3 („Die Nacht am Tor“,
// docs/plans/plan_kapitel2.md) plays on the twin of Suhl with a layer of 1989. What the sources say (bpb, Christian Dellit / Reinhard Wenzel,
// „Angst auf beiden Seiten – das Ende des MfS in Suhl“, 2018; Bundesarchiv/Stasi-Unterlagen-Archiv, „Das Ende“ and the podcast „Die Stasi
// und die Christbaumkugeln“): on the evening of 4 December 1989 about 3 000 people came up to the district office of the Stasi in the
// Hölderlinstraße („die Burg“, on the hill above the town), with candles, at the gate; shortly before midnight 16 of them and the district
// prosecutor were let in to seal cupboards; on the 5th bus drivers blocked the ways out. Slogans recorded in Suhl that autumn:
// „Volksfreiheit statt Staatssicherheit“, „Stasi unter parlamentarische Kontrolle!“, „Ihr wollt Vertrauen – gebt uns Vertrauen!“; sprayed
// on a wall of the office on 5 December: „Stasi raus – es ist aus!“. No violence – the game keeps to that.
// What this layer does (on/off with everything given back):
//   - the buildings of the era from 1991 are left out (kern/stadt.js S.jahr – every tile made again), the shop fronts with today's names
//     and the parked cars of today are not shown (suhl.js);
//   - at the compound (Hölderlinstraße 1 – today courts and offices): a fence of concrete posts and steel mesh along the street, the gate
//     of steel bars where the drive goes in, its two pillars, lamps over the gate, the windows of the office lit;
//   - the crowd: about 1 700 people drawn (instanced: legs, coat, head, a cap for some; winter colours of the time), on the street in front
//     of the gate and up the side roads, facing the gate, swaying a little; four in ten hold a candle (the flames flicker); banners with the
//     slogans on poles above them; a few Volkspolizisten inside the gate;
//   - cars of the time (Grenzland's GLAUTO: Trabant, Wartburg, Barkas) parked along the streets further down, when that module is there;
//   - one does not walk through it (Falko, 18.11.2026 20:54 „machst du weiter?“ – open since V19h): the people, the fence and the gate hold
//     the walker and vehicles off (KERN.pushOut through the package: a point within 0.6 m of the observer, or a probe of 0.5 m and more –
//     the figures of a mission walk on as before); whom the walker presses gives way a little, across his way, and comes back after a
//     while – so one gets through the crowd step by step, as in a real one;
//   - no buses of today while it is on (the stop „Suhl, Hölderlinstraße“ is 36 m from the gate; Grenzland's flashback does the same);
//   - the jump point welt/suhl.js SPOTS.suhl1989 (scene „Suhl 1989: Nacht am Tor“, ?suhl1989=1): 16 m before the gate in the street,
//     an aisle in the crowd behind it, where the camera stands.
// The mission puts its own people (Gerhard, the witness, the driver with the Barkas) on top; the night itself (clock, weather) is its
// business – api.jahr1989(true, { nacht: true }) sets 20:30 for a look without the mission.
// The compound lies in a loop of the Hölderlinstraße (south, west and north of it); the drive into the courtyard leaves the street's
// northern stretch heading south – there stood the gate.
const GATE = [-3960.4, 12361.5], // the gate across the drive (model metres)
  INWARD = [0.05, -0.9987], // from the gate into the compound (south)
  CENTRE = [-4000, 12320],
  NORTH = 12352; // the street's northern stretch: the part of the loop with the gate
const SLOGANS = [
  ['STASI RAUS –', 'ES IST AUS!'],
  ['VOLKSFREIHEIT STATT', 'STAATSSICHERHEIT'],
  ['STASI UNTER', 'PARLAMENTARISCHE KONTROLLE!'],
  ['IHR WOLLT VERTRAUEN –', 'GEBT UNS VERTRAUEN!'],
  ['KEINE GEWALT!'],
  ['STASI IN DIE', 'PRODUKTION!'],
];
// coats and anoraks of the time: dark, brownish, grey-blue, a few colours
const COATS = [
  ['#2a2d33', 0.16],
  ['#3a3128', 0.14],
  ['#4b4a45', 0.12],
  ['#28344a', 0.12],
  ['#5a4632', 0.1],
  ['#3d4436', 0.08],
  ['#6b2a26', 0.06],
  ['#7a6b55', 0.06],
  ['#1f4a5c', 0.05],
  ['#6d6455', 0.05],
  ['#4a2f45', 0.03],
  ['#5c2a22', 0.03],
];
const LEGS = ['#22252a', '#2c2f36', '#33302b', '#3b4150', '#1e2229'];
const SKIN = ['#a8826c', '#b58e76', '#9c7660', '#bb9580', '#94705c'];
const CAPS = ['#3b2f2a', '#2b2b2e', '#6b1f1f', '#2a3b5a', '#545048', '#7a6a50'];
const HAIR = ['#2a1d14', '#3b2a1c', '#1c1714', '#5a4530', '#6e6458', '#8a7a62', '#4a3322'];
const VP = '#4d5847'; // the Volkspolizei's green-grey
export function jahr1989(ctx, C, ST, api) {
  const { THREE, scene, markDirty, KERN } = ctx,
    S = { on: false, built: false, people: 0, candles: 0, banners: 0, cars: 0, t: 0, err: '' },
    G = new THREE.Group();
  G.name = 'suhl 1989';
  let undo = [],
    mats = [],
    HASH = null; // the people in cells of 2 m (S.pushOut)
  const WALLS = []; // the fence, the gate and its pillars: [x0, y0, x1, y1, half width]
  const hh = n => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const pick = (L, r) => {
    let a = 0;
    for (const [v, w] of L) if ((a += w) >= r) return v;
    return L[L.length - 1][0];
  };
  const gz = (x, y) => {
    const z = api.ground(x, y);
    return Number.isFinite(z) ? z : KERN.ground(x, y, 9999);
  };

  // ---- light: two of the world's shared point lights (no new ones in the scene) – the lamps over the gate and the candles' warm glow
  // over the crowd, while the layer stands and the observer is within 220 m ----
  if (KERN.lights && KERN.lights.borrow)
    KERN.lights.borrow({
      id: 'suhl:1989',
      n: 2,
      prio: 4,
      want: () => {
        if (!S.on || !S.built) return false;
        const o = KERN.where ? KERN.where() : null;
        return !o || Math.hypot(o[0] - GATE[0], o[1] - GATE[1]) < 220;
      },
      on: ls => {
        ls[0].color.setHex(0xfff0d0);
        ls[1].color.setHex(0xffc08a); // warm, not orange: an orange light made shop-window dummies of the crowd
        for (const l of ls) {
          l.distance = 32;
          l.decay = 1.3;
        }
      },
      tick: ls => {
        const gx = GATE[0] + INWARD[0] * 2.5,
          gy = GATE[1] + INWARD[1] * 2.5,
          cx = GATE[0] - INWARD[0] * 12,
          cy = GATE[1] - INWARD[1] * 12;
        ls[0].position.set(gx, gz(gx, gy) + 3.4, -gy);
        ls[0].intensity = 14;
        ls[1].position.set(cx, gz(cx, cy) + 2.2, -cy);
        ls[1].intensity = 6 * (0.92 + 0.08 * Math.sin(S.t * 9.0) * Math.sin(S.t * 5.3));
      },
    });

  // ---- the street in front of the compound: the Hölderlinstraße near the gate, as a polyline ----
  function street() {
    const W = ST.on ? ST.ways(GATE[0], GATE[1], 170) : [];
    const segs = [];
    for (const w of W) {
      if (w.name !== 'Hölderlinstraße') continue;
      const p = w.p;
      for (let i = 0; i + 3 < p.length; i += 2)
        if (p[i + 1] > NORTH && p[i + 3] > NORTH) segs.push([p[i], p[i + 1], p[i + 2], p[i + 3], w.w || 5]);
    }
    return segs;
  }
  // the side of the compound: the normal of the street towards the centre of the compound
  const towardIn = (x, y) => (CENTRE[0] - x) * INWARD[0] + (CENTRE[1] - y) * INWARD[1];

  // ---- where a person stands right now: the spot, moved aside by (ox, oy) while giving way (oz: the ground there) ----
  const _q = new THREE.Quaternion(),
    _e = new THREE.Euler(),
    _v = new THREE.Vector3(),
    _sc = new THREE.Vector3();
  const at = f => [f.x + (f.ox || 0), f.y + (f.oy || 0), f.oz === undefined ? f.z : f.oz];
  function bodyM(f, m) {
    const [x, y, z] = at(f);
    _e.set(0, -f.hd, 0, 'YXZ');
    _q.setFromEuler(_e);
    _sc.set(f.s, f.s, f.s);
    return m.compose(_v.set(x, z, -y), _q, _sc);
  }
  // a candle: in the right hand in front of the chest (up: the flame above the wax)
  function candleM(f, up, m) {
    const [x, y, z] = at(f),
      fx = Math.sin(f.hd),
      fy = Math.cos(f.hd),
      rx = Math.cos(f.hd),
      ry = -Math.sin(f.hd);
    return m.makeTranslation(
      x + fx * 0.28 * f.s + rx * 0.11 * f.s,
      z + 1.1 * f.s + up,
      -(y + fy * 0.28 * f.s + ry * 0.11 * f.s)
    );
  }

  // ---- the people: one instanced mesh per part (legs, coat, head, cap) and the candles' wax and flames ----
  function figures(list) {
    // the parts of a figure (metres, facing +z): legs in trousers, a winter coat flaring a little to the knee, arms bent forward,
    // hands, neck and head, a knitted cap – each part one geometry for all (merged by hand: no helper module in the package)
    const merge = geos => {
      let nv = 0,
        ni = 0;
      for (const g of geos) {
        nv += g.attributes.position.count;
        ni += g.index ? g.index.count : g.attributes.position.count;
      }
      const P = new Float32Array(nv * 3),
        N = new Float32Array(nv * 3),
        I = new Uint32Array(ni);
      let ov = 0,
        oi = 0;
      for (const g of geos) {
        P.set(g.attributes.position.array, ov * 3);
        N.set(g.attributes.normal.array, ov * 3);
        const idx = g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, k) => k);
        for (let k = 0; k < idx.length; k++) I[oi + k] = idx[k] + ov;
        ov += g.attributes.position.count;
        oi += idx.length;
        g.dispose();
      }
      const m = new THREE.BufferGeometry();
      m.setAttribute('position', new THREE.BufferAttribute(P, 3));
      m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      m.setIndex(new THREE.BufferAttribute(I, 1));
      return m;
    };
    const limb = (r0, r1, a, b) => {
      // a cylinder from point a to point b
      const g = new THREE.CylinderGeometry(r1, r0, 1, 7, 1),
        A = new THREE.Vector3(...a),
        B = new THREE.Vector3(...b),
        d = new THREE.Vector3().subVectors(B, A),
        q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      g.scale(1, d.length(), 1);
      g.applyQuaternion(q);
      g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      return g;
    };
    // legs, shoes and gloves: the dark part
    const legsG = merge([
      limb(0.075, 0.065, [-0.1, 0.02, 0], [-0.1, 0.8, 0]),
      limb(0.075, 0.065, [0.1, 0.02, 0], [0.1, 0.8, 0]),
      new THREE.SphereGeometry(0.045, 8, 6).translate(-0.12, 1.0, 0.27),
      new THREE.SphereGeometry(0.045, 8, 6).translate(0.11, 1.02, 0.28),
    ]);
    // the coat: a lathe (hem, waist, chest, shoulders, collar), flattened front to back
    const prof = [
      [0.0, 0.5],
      [0.27, 0.52],
      [0.24, 0.8],
      [0.21, 1.02],
      [0.23, 1.25],
      [0.2, 1.38],
      [0.1, 1.44],
      [0.07, 1.47],
      [0.0, 1.47],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const torso = new THREE.LatheGeometry(prof, 12);
    torso.scale(1, 1, 0.62);
    torso.computeVertexNormals();
    const coatG = merge([
      torso,
      limb(0.06, 0.055, [-0.22, 1.36, 0], [-0.23, 1.08, 0.06]),
      limb(0.055, 0.05, [-0.23, 1.08, 0.06], [-0.13, 1.02, 0.24]),
      limb(0.06, 0.055, [0.22, 1.36, 0], [0.23, 1.08, 0.06]),
      limb(0.055, 0.05, [0.23, 1.08, 0.06], [0.12, 1.04, 0.25]),
    ]);
    const headG = merge([
      new THREE.SphereGeometry(0.095, 12, 10).scale(0.92, 1.08, 1).translate(0, 1.6, 0.01),
      limb(0.045, 0.045, [0, 1.44, 0], [0, 1.54, 0]),
    ]);
    const capG = new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.52)
      .scale(0.94, 1.1, 1.02)
      .translate(0, 1.62, 0.005);
    // hair where there is no cap: over the crown and down the back of the head
    const hairG = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62)
      .rotateX(-0.35)
      .scale(0.96, 1.04, 1.05)
      .translate(0, 1.615, -0.012);
    // a very faint warm glow of their own (the candles light the crowd from below; one borrowed light cannot do that for all) – an
    // orange one made shop-window dummies of them
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0,
      emissive: '#0e0804',
      emissiveIntensity: 1,
    });
    // a slow sway (weight from one foot to the other) in the vertex shader: by person (aPh – the instance's number differs between the
    // parts, a cap swayed off its head with it), more at the shoulders than at the feet
    const U = { uT: { value: 0 } };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = U.uT;
      sh.vertexShader =
        'attribute float aPh;\nuniform float uT;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n float ph = aPh; transformed.x += sin( uT * 0.9 + ph ) * 0.018 * transformed.y; transformed.z += sin( uT * 0.63 + ph * 1.3 ) * 0.01 * transformed.y;'
        );
    };
    mat.customProgramCacheKey = () => 'suhl1989-fig';
    mats.push(mat);
    const parts = [
      [legsG, i => list[i].legs],
      [coatG, i => list[i].coat],
      [headG, i => list[i].skin],
      [capG, i => list[i].cap],
      [hairG, i => (list[i].cap ? null : list[i].hair)],
    ];
    const m4 = new THREE.Matrix4(),
      col = new THREE.Color();
    for (const [geo, colOf] of parts) {
      const cnt = list.filter((f, i) => colOf(i)).length,
        me = new THREE.InstancedMesh(geo, mat, Math.max(1, cnt)),
        ph = new Float32Array(Math.max(1, cnt));
      let k = 0;
      list.forEach((f, i) => {
        const c = colOf(i);
        if (!c) return;
        me.setMatrixAt(k, bodyM(f, m4));
        me.setColorAt(k, col.set(c));
        ph[k] = i * 1.7317;
        (f.inst || (f.inst = [])).push([me, k]); // where this one is drawn (a real figure folds it away, giving way moves it)
        k++;
      });
      geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
      me.count = k;
      me.castShadow = false;
      me.receiveShadow = false;
      me.frustumCulled = false;
      G.add(me);
    }
    // the candles: a white stick in the hand and a flame above it that flickers (additive, no light of its own)
    const lit = list.filter(f => f.candle);
    if (lit.length) {
      const waxG = new THREE.CylinderGeometry(0.012, 0.012, 0.13, 6);
      const waxM = new THREE.MeshStandardMaterial({
        color: '#eee8d8',
        roughness: 0.6,
        emissive: '#5a3a10',
        emissiveIntensity: 0.6,
      });
      const flG = new THREE.ConeGeometry(0.016, 0.07, 6);
      const flM = new THREE.MeshBasicMaterial({
        color: '#ffcf7a',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowM = new THREE.MeshBasicMaterial({
        color: '#ff9a3a',
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      flM.onBeforeCompile = sh => {
        sh.uniforms.uT = U.uT;
        sh.vertexShader =
          'uniform float uT;\n' +
          sh.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\n float fl = 0.8 + 0.25 * sin( uT * 11.0 + float( gl_InstanceID ) * 2.3 ) + 0.12 * sin( uT * 23.0 + float( gl_InstanceID ) );\n transformed.y *= fl; transformed.x += 0.004 * sin( uT * 7.0 + float( gl_InstanceID ) );'
          );
      };
      flM.customProgramCacheKey = () => 'suhl1989-flame';
      mats.push(waxM, flM, glowM);
      const glowG = new THREE.SphereGeometry(0.06, 8, 6);
      const W = new THREE.InstancedMesh(waxG, waxM, lit.length),
        F = new THREE.InstancedMesh(flG, flM, lit.length),
        H = new THREE.InstancedMesh(glowG, glowM, lit.length);
      W.userData.up = 0;
      F.userData.up = H.userData.up = 0.09;
      lit.forEach((f, i) => {
        for (const me of [W, F, H]) me.setMatrixAt(i, candleM(f, me.userData.up, m4));
        (f.inst || (f.inst = [])).push([W, i], [F, i], [H, i]);
      });
      for (const me of [W, F, H]) {
        me.frustumCulled = false;
        me.renderOrder = me === W ? 0 : 3;
        G.add(me);
      }
    }
    S.u = U;
  }

  // ---- the banners: a sheet between two poles, the slogan painted on (one canvas each) ----
  function banner(lines, x, y, hd, w) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#ece6d6';
    g.fillRect(0, 0, 512, 160);
    // a bedsheet: a few folds
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(0,0,0,' + (0.03 + hh(x + i) * 0.04) + ')';
      g.fillRect(hh(y + i) * 512, 0, 6 + hh(i + x) * 18, 160);
    }
    // the back: the same sheet before the paint (the paint shows through below, faint – seen from behind it reads mirrored, as
    // through a bedsheet; painted black on both faces it looked like a mistake)
    const cb = document.createElement('canvas');
    cb.width = 512;
    cb.height = 160;
    const gb = cb.getContext('2d');
    gb.drawImage(c, 0, 0);
    g.fillStyle = hh(x * 3) < 0.35 ? '#9a1f1a' : '#1d1d1d';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fs = lines.length === 1 ? 64 : 46;
    g.font = '700 ' + fs + 'px "Arial Narrow", Arial, sans-serif';
    lines.forEach((t, i) => {
      const yy = lines.length === 1 ? 82 : 52 + i * 58;
      // painted by hand: each letter a little off the line
      let xx = 256 - g.measureText(t).width / 2;
      for (const ch of t) {
        const wch = g.measureText(ch).width;
        g.save();
        g.translate(xx + wch / 2, yy + (hh(xx + i) - 0.5) * 5);
        g.rotate((hh(xx * 1.7) - 0.5) * 0.06);
        g.fillText(ch, 0, 0);
        g.restore();
        xx += wch;
      }
    });
    gb.globalAlpha = 0.16;
    gb.drawImage(c, 0, 0);
    const tex = new THREE.CanvasTexture(c),
      texB = new THREE.CanvasTexture(cb);
    for (const t of [tex, texB]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.FrontSide }),
      mB = new THREE.MeshStandardMaterial({ map: texB, roughness: 0.95, side: THREE.BackSide });
    mats.push(m, mB);
    const h = w * 0.3,
      z = gz(x, y),
      sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 8, 2), m);
    sheet.add(new THREE.Mesh(sheet.geometry, mB));
    // a little sag in the middle
    const p = sheet.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w + 0.5) * Math.PI) * 0.06);
    p.needsUpdate = true;
    sheet.geometry.computeVertexNormals();
    sheet.position.set(x, z + 2.25, -y);
    sheet.rotation.set(0, -hd + Math.PI, 0);
    G.add(sheet);
    const poleM = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.9 });
    mats.push(poleM);
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.9, 6), poleM);
      pole.position.set(x + Math.cos(hd) * s * (w / 2), z + 1.45, -(y - Math.sin(hd) * s * (w / 2)));
      G.add(pole);
    }
    S.banners++;
  }

  // ---- the fence along the street and the gate ----
  function fence(L) {
    const post = new THREE.MeshStandardMaterial({ color: '#9a978e', roughness: 0.85 }),
      mesh = new THREE.MeshStandardMaterial({
        color: '#3a3d3f',
        roughness: 0.6,
        metalness: 0.4,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      steel = new THREE.MeshStandardMaterial({ color: '#2f3336', roughness: 0.5, metalness: 0.6 });
    mats.push(post, mesh, steel);
    // the line of the fence: the street's edge on the compound's side, 1.5 m further in
    const line = [];
    for (const [ax, ay, bx, by, w] of L)
      for (const [x, y] of [
        [ax, ay],
        [bx, by],
      ]) {
        if (Math.abs(x - GATE[0]) > 85 || line.some(q => Math.hypot(q[2] - x, q[3] - y) < 0.5)) continue;
        const s = towardIn(x, y) > 0 ? 1 : -1;
        line.push([x + INWARD[0] * s * (w / 2 + 3.2), y + INWARD[1] * s * (w / 2 + 3.2), x, y]);
      }
    line.sort((a, b) => a[0] - b[0]);
    const postG = new THREE.BoxGeometry(0.14, 2.3, 0.14);
    const posts = [];
    for (let i = 0; i + 1 < line.length; i++) {
      const [ax, ay] = line[i],
        [bx, by] = line[i + 1],
        L1 = Math.hypot(bx - ax, by - ay),
        n = Math.max(1, Math.round(L1 / 2.5));
      for (let k = 0; k < n; k++) {
        const t0 = k / n,
          t1 = (k + 1) / n,
          x0 = ax + (bx - ax) * t0,
          y0 = ay + (by - ay) * t0,
          x1 = ax + (bx - ax) * t1,
          y1 = ay + (by - ay) * t1;
        // the gate's opening: 4.5 m either side of the drive
        if (Math.hypot((x0 + x1) / 2 - GATE[0], (y0 + y1) / 2 - GATE[1]) < 4.5) continue;
        const z0 = gz(x0, y0),
          z1 = gz(x1, y1),
          len = Math.hypot(x1 - x0, y1 - y0),
          pan = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.0), mesh);
        pan.position.set((x0 + x1) / 2, (z0 + z1) / 2 + 1.1, -(y0 + y1) / 2);
        pan.rotation.set(0, Math.atan2(y1 - y0, x1 - x0), 0);
        G.add(pan);
        posts.push([x0, y0, z0]);
        WALLS.push([x0, y0, x1, y1, 0.08]); // one does not walk through it (S.pushOut)
      }
    }
    const PI = new THREE.InstancedMesh(postG, post, Math.max(1, posts.length));
    const m4 = new THREE.Matrix4();
    posts.forEach(([x, y, z], i) => PI.setMatrixAt(i, m4.makeTranslation(x, z + 1.15, -y)));
    PI.count = posts.length;
    G.add(PI);
    // the gate: two pillars and two leaves of upright steel bars in a frame, shut
    const gx = GATE[0] + INWARD[0] * 3,
      gy = GATE[1] + INWARD[1] * 3,
      gzz = gz(gx, gy),
      across = [-INWARD[1], INWARD[0]],
      pillarG = new THREE.BoxGeometry(0.5, 2.7, 0.5);
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(pillarG, post);
      p.position.set(gx + across[0] * s * 4.3, gzz + 1.35, -(gy + across[1] * s * 4.3));
      G.add(p);
      // a lamp on each pillar: a white globe that glows
      const lampM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff2d0', emissiveIntensity: 2.2 });
      mats.push(lampM);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampM);
      l.position.set(p.position.x, gzz + 2.9, p.position.z);
      G.add(l);
      const leaf = new THREE.Group();
      for (let k = 0; k <= 16; k++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.9, 0.03), steel);
        bar.position.set(-s * (k / 16) * 4.0, 1.0, 0);
        leaf.add(bar);
      }
      for (const yy of [0.12, 1.0, 1.9]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.07, 0.05), steel);
        rail.position.set(-s * 2.0, yy, 0);
        leaf.add(rail);
      }
      leaf.position.set(gx + across[0] * s * 4.05, gzz, -(gy + across[1] * s * 4.05));
      leaf.rotation.y = Math.atan2(across[1], across[0]);
      G.add(leaf);
      // the pillar holds one off as well (a point with its half width)
      const px = gx + across[0] * s * 4.3,
        py = gy + across[1] * s * 4.3;
      WALLS.push([px, py, px, py, 0.3]);
    }
    // the shut gate across the drive, from pillar to pillar
    WALLS.push([gx - across[0] * 4.3, gy - across[1] * 4.3, gx + across[0] * 4.3, gy + across[1] * 4.3, 0.08]);
    S.fence = posts.length;
  }

  // ---- where the people stand: on the street before the gate and up the side ways, not in houses, not behind the fence ----
  function crowd(L) {
    const out = [];
    const near = (x, y) => Math.hypot(x - GATE[0], y - GATE[1]);
    // the jump point (welt/suhl.js SPOTS.suhl1989): room to stand, and an aisle behind it to the right shoulder, where the camera is
    const J0 = ctx.SUHL && ctx.SUHL.SPOTS && ctx.SUHL.SPOTS.suhl1989,
      jx = J0 ? J0[0][0] : 1e9,
      jy = J0 ? J0[0][1] : 1e9,
      jy0 = J0 ? (J0[1] * Math.PI) / 180 : 0,
      aisle = (x, y) => {
        const dx = x - jx,
          dy = y - jy,
          fwd = dx * Math.sin(jy0) + dy * Math.cos(jy0),
          right = dx * Math.cos(jy0) - dy * Math.sin(jy0);
        return dx * dx + dy * dy < 1.2 * 1.2 || (fwd < 0 && fwd > -4.6 && right > -0.7 && right < 1.5);
      };
    let tries = 0,
      seed = 1;
    const want = 1700;
    while (out.length < want && tries < want * 12) {
      tries++;
      // along the street: a point on it, then across it (street and pavements: ±(w/2 + 3) m), denser near the gate
      const sg = L[Math.floor(hh(seed++) * L.length)];
      if (!sg) break;
      const [ax, ay, bx, by, w] = sg,
        t = hh(seed++),
        x0 = ax + (bx - ax) * t,
        y0 = ay + (by - ay) * t,
        d0 = near(x0, y0);
      if (d0 > 140) continue;
      if (hh(seed++) > Math.exp(-d0 / 55)) continue;
      const dx = bx - ax,
        dy = by - ay,
        len = Math.hypot(dx, dy) || 1;
      // across the street (the normal turned to point away from the compound): pavements on both sides, more room on the far side
      let nx = dy / len,
        ny = -dx / len;
      if (nx * INWARD[0] + ny * INWARD[1] > 0) {
        nx = -nx;
        ny = -ny;
      }
      const off = -(w / 2 + 2.6) + hh(seed++) * (w + 2.6 + 9),
        x = x0 + nx * off,
        y = y0 + ny * off;
      // not behind the fence: on the compound's side only up to the fence line, except in the gate's mouth
      const side = (x - x0) * INWARD[0] + (y - y0) * INWARD[1];
      if (side > w / 2 + 2.6 && near(x, y) > 6) continue;
      if (near(x, y) < 2.6 || aisle(x, y)) continue;
      if (api.buildingAt && api.buildingAt(x, y)) continue;
      if (out.some(o => (o.x - x) ** 2 + (o.y - y) ** 2 < 0.36)) continue;
      const z = gz(x, y);
      if (!Number.isFinite(z)) continue;
      out.push({ x, y, z, d: near(x, y) });
    }
    return out;
  }

  // ---- the people near the observer as real figures: Grenzland's GLFIG (Rocketbox figures in the clothes of 1989, painted by body zone,
  // with the headwear and hair of the time) on the nearest spots of the crowd, a candle in the right hand held up before the chest (the
  // pose of Grenzland's torch, F.lampe); the instanced stand-ins of those spots are folded away. As the observer moves, the figures go to
  // the spots then nearest (placed again, not loaded again); beyond 160 m they are let go. Without GLFIG (no Grenzland in the page) the
  // instanced crowd alone. During the mission Grenzland's loop moves them (GLFIG.tick), else this layer does. ----
  const NEAR_N = ctx.COARSE ? 6 : 24,
    VP_N = ctx.COARSE ? 2 : 6,
    NEAR = { figs: [], vp: [], busy: false, k: 0, t: 0, at: [1e9, 1e9], err: '' },
    ZERO = new THREE.Matrix4().makeScale(0, 0, 0),
    _m = new THREE.Matrix4(),
    _s3 = new THREE.Vector3();
  // who: the figure files of the streets' people, in coats, anoraks and quilted jackets of the time
  const PEOPLE = [
    ['vk_m11', 'm', 1.79, 's89mantelgrau', 'hut', null, 'schnauzer', null],
    ['vk_f02', 'f', 1.64, 's89mantelbraun', 'kopftuch', null, null, null],
    ['vk_m02', 'm', 1.82, 'parka', null, 'vokuhila', null, null],
    ['vk_f07', 'f', 1.68, 'anorak', null, 'dauerwelle', null, 'gross'],
    ['vk_m16', 'm', 1.8, 's89mantelschwarz', 'schieber', null, 'schnauzer', null],
    ['vk_f12', 'f', 1.66, 's89steppblau', 'strickblau', null, null, null],
    ['vk_m07', 'm', 1.76, 'watte', 'strick', null, null, 'gross'],
    ['vk_f14', 'f', 1.7, 's89mantelgrau', null, 'dauerwellelang', null, null],
    ['vk_m20', 'm', 1.78, 's89steppbraun', null, 'scheitel', null, null],
    ['vk_f15', 'f', 1.62, 's89mantelbraun', 'hut', null, null, null],
    ['vk_m02', 'm', 1.8, 's89mantelschwarz', 'schiebergrau', null, null, 'gross'],
    ['vk_f12', 'f', 1.67, 'watte', null, 'dauerwelle', null, null],
    ['vk_m16', 'm', 1.77, 's89steppblau', 'strick', null, 'schnauzer', null],
    ['vk_f07', 'f', 1.69, 's89mantelgrau', 'kopftuchblau', null, null, null],
  ];
  // coats of the time (sRGB): the clothes of Grenzland's table plus a few for the cold night (added once, if not there)
  const KLEID89 = {
    s89mantelgrau: { ober: [88, 88, 84], unter: [44, 46, 50], schuh: [28, 26, 24], rock: 0.4, arm: true },
    s89mantelbraun: { ober: [86, 64, 46], unter: [52, 46, 42], schuh: [34, 26, 20], rock: 0.4, arm: true },
    s89mantelschwarz: { ober: [36, 36, 40], unter: [38, 38, 42], schuh: [20, 20, 20], rock: 0.42, arm: true },
    s89steppblau: {
      ober: [46, 64, 100],
      oberM: 'steppung',
      unter: [62, 66, 80],
      unterM: 'stonewash',
      schuh: [40, 36, 32],
      arm: true,
    },
    s89steppbraun: {
      ober: [104, 78, 50],
      oberM: 'steppung',
      unter: [70, 60, 50],
      unterM: 'cord',
      schuh: [44, 32, 24],
      arm: true,
    },
  };
  // the Volkspolizei behind the gate: Grenzland's uniform and cap of the time (KLEID/hut 'vopo') on several figures
  const VPS = [
    ['vk_m02', 1.83, null],
    ['vk_m16', 1.79, 'schnauzer'],
    ['vk_m11', 1.81, null],
    ['vk_m20', 1.77, null],
    ['vk_m07', 1.85, 'schnauzer'],
    ['vk_m16', 1.8, null],
  ];
  function vpCast(k) {
    const D = window.GLDATA,
      [fig, h, bart] = VPS[k % VPS.length],
      id = 'suhl89vp_' + (k % VPS.length);
    if (!D.CAST[id]) D.CAST[id] = { name: 'Volkspolizist', fig, clips: 'm', h, kleid: 'vopo', hut: 'vopo', bart };
    return id;
  }
  const FG = () => (window.GLFIG && window.GLDATA && GLFIG.make && GLFIG.place && GLFIG.avail ? GLFIG : null);
  function castOf(k) {
    const D = window.GLDATA,
      [fig, clips, h, kleid, hut, haar, bart, brille] = PEOPLE[k % PEOPLE.length],
      id = 'suhl89_' + (k % PEOPLE.length);
    for (const [n, v] of Object.entries(KLEID89)) if (!D.KLEID[n]) D.KLEID[n] = v;
    if (!D.CAST[id])
      D.CAST[id] = {
        name: clips === 'f' ? 'Demonstrantin' : 'Demonstrant',
        fig,
        clips,
        h,
        kleid,
        hut,
        haar,
        bart,
        brille,
      };
    return id;
  }
  // a candle in the hand: wax, a flame that flickers, a glow – kept upright at the hand by this layer each frame (a child of the hand
  // bone it turned with the hand: Grenzland's pose raises the arm after the figure's own update)
  let candleKit = null;
  function candleOf(F) {
    const B = F.f && F.f.bones && F.f.bones.RightHand;
    if (!B) return null;
    if (!candleKit) {
      // a soft round glow (a sprite with a gradient: a sphere read as a pale disc – „lollipops“), a small flame with a bright core
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const cx = cv.getContext('2d'),
        gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,214,150,0.9)');
      gr.addColorStop(0.25, 'rgba(255,170,90,0.35)');
      gr.addColorStop(1, 'rgba(255,140,60,0)');
      cx.fillStyle = gr;
      cx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const wax = new THREE.MeshStandardMaterial({
          color: '#efe6d2',
          roughness: 0.55,
          emissive: '#5a3a10',
          emissiveIntensity: 0.6,
        }),
        fl = new THREE.MeshBasicMaterial({
          color: '#fff1c8',
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
        gl = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
      mats.push(wax, fl, gl); // (the glow's texture goes with its material)
      candleKit = {
        waxG: new THREE.CylinderGeometry(0.011, 0.011, 0.12, 10).translate(0, 0.06, 0),
        flG: new THREE.SphereGeometry(0.0085, 8, 6).scale(1, 2.3, 1),
        wax,
        fl,
        gl,
      };
    }
    const K = candleKit,
      g = new THREE.Group(),
      w = new THREE.Mesh(K.waxG, K.wax),
      f = new THREE.Mesh(K.flG, K.fl),
      h = new THREE.Sprite(K.gl);
    w.position.y = -0.04;
    f.position.y = 0.1;
    h.position.y = 0.1;
    h.scale.setScalar(0.17);
    h.renderOrder = f.renderOrder = 3;
    for (const m of [w, f, h]) {
      m.frustumCulled = false;
      g.add(m);
    }
    G.add(g);
    return { g, flame: f, glow: h, bone: B };
  }
  // a spot's stand-ins: where the person stands now, or folded away (a real figure stands there)
  function put(f, hide) {
    if (!f.inst) return;
    for (const [me, k] of f.inst) {
      me.setMatrixAt(k, hide ? ZERO : me.userData.up === undefined ? bodyM(f, _m) : candleM(f, me.userData.up, _m));
      me.instanceMatrix.needsUpdate = true;
    }
  }
  function standIn(f, show) {
    if (show) f.fig = null;
    put(f, !show);
  }
  function nearDrop() {
    const G2 = FG();
    for (const n of NEAR.figs) {
      if (n.spot) standIn(n.spot, true);
      if (n.c && n.c.g.parent) n.c.g.parent.remove(n.c.g);
      if (G2) G2.drop(n.F);
    }
    for (const n of NEAR.vp) {
      if (n.spot) standIn(n.spot, true);
      if (G2 && n.F) G2.drop(n.F);
    }
    NEAR.figs = [];
    NEAR.vp = [];
    NEAR.k = 0;
  }
  function nearTick(dt) {
    const G2 = FG();
    if (!G2 || !S.list) return;
    NEAR.t -= dt;
    // moved by this layer when Grenzland's loop does not run (and no one else's figures stand – they are moved by their own)
    if (
      !(window.GLSTATE && GLSTATE.on) &&
      G2.tick &&
      (G2.figs || []).every(F => !F.g.visible || NEAR.figs.some(n => n.F === F) || NEAR.vp.some(n => n.F === F))
    )
      G2.tick(dt);
    // the candles: in the fist (a little before and above the wrist), upright, flickering
    const fl = 0.85 + 0.2 * Math.sin(S.t * 11) * Math.sin(S.t * 6.7);
    for (const n of NEAR.figs)
      if (n.c) {
        const hd = n.F.hd || 0;
        n.c.bone.getWorldPosition(_s3);
        n.c.g.position.set(_s3.x + Math.sin(hd) * 0.05, _s3.y + 0.03, _s3.z - Math.cos(hd) * 0.05);
        n.c.g.visible = n.F.g.visible && !!n.spot;
        n.c.flame.scale.set(1, fl + 0.1 * Math.sin(S.t * 17 + n.k), 1);
        n.c.glow.scale.setScalar(0.17 * (0.9 + 0.15 * fl));
      }
    if (NEAR.t > 0) return;
    NEAR.t = 0.5;
    // the camera decides who is seen up close (in the game it is beside the walker; a free view stands where it looks from)
    const o = ctx.cam ? [ctx.cam.position.x, -ctx.cam.position.z] : KERN.where ? KERN.where() : null;
    if (!o) return;
    if (Math.hypot(o[0] - GATE[0], o[1] - GATE[1]) > 160) {
      if (NEAR.figs.length) nearDrop();
      return;
    }
    // one more figure at a time, until there are enough
    if (!NEAR.busy && NEAR.figs.length < NEAR_N) {
      const id = castOf(NEAR.k);
      if (G2.avail(id)) {
        NEAR.busy = true;
        const k = NEAR.k++;
        G2.make(id, { era: '1989' })
          .then(F => {
            NEAR.busy = false;
            if (!F) return;
            if (!S.on || !S.built) return G2.drop(F);
            F.lampe = true; // the right hand up before the chest (grenzland/gl_pose.js)
            F.sees = false;
            NEAR.figs.push({ F, k, spot: null, c: candleOf(F) });
          })
          .catch(e => {
            NEAR.busy = false;
            NEAR.err = String((e && e.message) || e);
          });
      } else NEAR.k++;
    }
    // the Volkspolizei behind the bars as real figures too, once the first demonstrators stand and the observer is within 70 m (the
    // stand-ins looked like shop-window dummies through the gate)
    const vps = S.list.filter(f => !f.demo);
    if (
      !NEAR.busy &&
      NEAR.vp.length < Math.min(VP_N, vps.length) &&
      NEAR.figs.length >= Math.min(NEAR_N, 6) &&
      Math.hypot(o[0] - GATE[0], o[1] - GATE[1]) < 70
    ) {
      const id = vpCast(NEAR.vp.length);
      if (G2.avail(id)) {
        NEAR.busy = true;
        G2.make(id, { era: '1989' })
          .then(F => {
            NEAR.busy = false;
            if (!F) return;
            const sp = vps.find(v => !v.fig);
            if (!S.on || !S.built || !sp) return G2.drop(F);
            F.sees = false;
            const n = { F, spot: sp, vp: true };
            NEAR.vp.push(n);
            standIn(sp, false);
            sp.fig = n;
            G2.place(F, sp.x, sp.y, sp.hd);
          })
          .catch(e => {
            NEAR.busy = false;
            NEAR.vp.push({ F: null, spot: null, vp: true });
            NEAR.err = String((e && e.message) || e);
          });
      } else NEAR.vp.push({ F: null, spot: null, vp: true }); // that figure is not there: the stand-in stays
    }
    // the spots nearest the observer (demonstrators only), each figure to one of them
    const want = S.list
      .filter(f => f.demo)
      .map(f => [(f.x - o[0]) ** 2 + (f.y - o[1]) ** 2, f])
      .sort((a, b) => a[0] - b[0])
      .slice(0, NEAR.figs.length)
      .map(a => a[1]);
    const taken = new Set(NEAR.figs.map(n => n.spot).filter(sp => sp && want.includes(sp)));
    for (const n of NEAR.figs) {
      if (n.spot && want.includes(n.spot)) continue;
      const sp = want.find(w => !taken.has(w));
      if (!sp) continue;
      if (n.spot) standIn(n.spot, true);
      n.spot = sp;
      taken.add(sp);
      standIn(sp, false);
      sp.fig = n;
      const [x, y] = at(sp);
      G2.place(n.F, x, y, sp.hd);
    }
    markDirty(true);
  }

  // ---- one does not walk through people, the fence or the gate. Each person is a circle of 0.23 m (by size); who is held off: the
  // walker (a point within 0.6 m of the observer) and vehicles (their probes of 0.5 m and more – welt/fahrt.js VEH.hitsOut); the figures
  // of a mission (smaller probes away from the observer) walk on as before. Whom the walker presses gives way: up to 0.4 m across his
  // way, to the side the person stands on (straight away from him when he stands), in about half a second, and back slowly once he has
  // gone on – so one gets through the crowd step by step. A real figure on that spot moves with it. ----
  const BODY = 0.23,
    GIVE = 0.4,
    CELL = 2,
    WK = { x: 0, y: 0, vx: 0, vy: 0, ok: false }, // the observer and how he moves (smoothed)
    giving = new Set();
  const cellKey = (i, j) => i * 65536 + j;
  function hashUp(list) {
    HASH = new Map();
    for (const f of list) {
      const k = cellKey(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
      let a = HASH.get(k);
      if (!a) HASH.set(k, (a = []));
      a.push(f);
    }
  }
  function give(f, dx, dy) {
    // dx, dy: from the person to the walker
    let gx = -dx,
      gy = -dy;
    const vv = Math.hypot(WK.vx, WK.vy);
    if (vv > 0.25) {
      const ux = WK.vx / vv,
        uy = WK.vy / vv,
        left = ux * gy - uy * gx >= 0; // the person stands left of his way
      gx = (left ? -uy : uy) * 0.9 + ux * 0.25;
      gy = (left ? ux : -ux) * 0.9 + uy * 0.25;
    }
    const l = Math.hypot(gx, gy) || 1;
    f.gx = gx / l;
    f.gy = gy / l;
    f.gt = 2.2;
    giving.add(f);
  }
  S.pushOut = (p, r) => {
    if (!S.built || !HASH) return undefined;
    const ex = p[0] - GATE[0],
      ey = p[1] - GATE[1];
    if (ex * ex + ey * ey > 230 * 230) return undefined;
    const walker = WK.ok && r < 0.5 && Math.hypot(WK.x - p[0], WK.y - p[1]) < 0.6;
    if (!walker && r < 0.5) return undefined;
    let moved = false;
    for (const [ax, ay, bx, by, w] of WALLS) {
      const dx = bx - ax,
        dy = by - ay,
        l2 = dx * dx + dy * dy,
        u = l2 > 1e-9 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0,
        qx = ax + dx * u,
        qy = ay + dy * u,
        nx = p[0] - qx,
        ny = p[1] - qy,
        d = Math.hypot(nx, ny),
        rr = r + w;
      if (d >= rr || d < 1e-6) continue;
      p[0] = qx + (nx / d) * rr;
      p[1] = qy + (ny / d) * rr;
      moved = true;
    }
    const R = r + BODY * 1.1 + 0.15,
      i0 = Math.floor((p[0] - R) / CELL),
      i1 = Math.floor((p[0] + R) / CELL),
      j0 = Math.floor((p[1] - R) / CELL),
      j1 = Math.floor((p[1] + R) / CELL);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const a = HASH.get(cellKey(i, j));
        if (!a) continue;
        for (const f of a) {
          const [fx, fy] = at(f),
            dx = p[0] - fx,
            dy = p[1] - fy,
            d2 = dx * dx + dy * dy,
            rr = r + BODY * f.s;
          if (walker && f.demo && d2 < (rr + 0.12) * (rr + 0.12)) give(f, dx, dy);
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2);
          if (d > 1e-6) {
            p[0] = fx + (dx / d) * rr;
            p[1] = fy + (dy / d) * rr;
          } else p[0] = fx + rr;
          moved = true;
        }
      }
    return moved ? true : undefined;
  };
  function giveTick(dt) {
    const o = KERN.where ? KERN.where() : null;
    if (o) {
      if (WK.ok && dt > 0) {
        const vx = (o[0] - WK.x) / dt,
          vy = (o[1] - WK.y) / dt,
          k = Math.min(1, dt * 6);
        if (Math.hypot(vx, vy) < 12) {
          WK.vx += (vx - WK.vx) * k;
          WK.vy += (vy - WK.vy) * k;
        } else WK.vx = WK.vy = 0; // a jump, not a walk
      }
      WK.x = o[0];
      WK.y = o[1];
      WK.ok = true;
    }
    if (!giving.size) return;
    const G2 = FG();
    for (const f of giving) {
      f.gt -= dt;
      const ox = f.ox || 0,
        oy = f.oy || 0;
      let tx = 0,
        ty = 0,
        v = 0.25; // back, slowly
      if (f.gt > 0) {
        tx = f.gx * GIVE;
        ty = f.gy * GIVE;
        v = 0.9;
      } else if (o && Math.hypot(o[0] - f.x, o[1] - f.y) < 1.1) continue; // he is still beside: stays aside
      const dx = tx - ox,
        dy = ty - oy,
        d = Math.hypot(dx, dy);
      if (d < 0.004) {
        if (f.gt <= 0) {
          f.ox = f.oy = 0;
          f.oz = undefined;
          giving.delete(f);
        }
        continue;
      }
      const st = Math.min(d, v * dt);
      f.ox = ox + (dx / d) * st;
      f.oy = oy + (dy / d) * st;
      const [x, y] = at(f),
        z = gz(x, y);
      f.oz = Number.isFinite(z) ? z : f.z;
      if (f.fig && G2) G2.place(f.fig.F, x, y, f.hd);
      else if (!f.fig) put(f, false);
    }
    markDirty(true);
  }
  // ---- no buses of today in 1989: while the layer is on and Suhl near (its zone ticks), the bus plan starts none and those about go
  // (not the one ridden); given back when the layer goes or Suhl is left – only if this layer stopped them ----
  const BH = { on: false, took: false };
  function buses(hold) {
    const B = window.BUS;
    if (!B || !B.S || hold === BH.on) return;
    BH.on = hold;
    if (hold) {
      BH.took = !!B.S.auto;
      B.S.auto = false;
      for (const I of (B.S.inst || []).slice()) if (!(B.S.ride && B.S.ride.I === I) && B.drop) B.drop(I);
    } else if (BH.took) {
      BH.took = false;
      if (B.S.auto === false) B.S.auto = true;
    }
  }

  // ---- the player in a coat of the time (the scene „Suhl 1989: Nacht am Tor“ asks for it – { spieler: true }; Grenzland's mission
  // dresses its Gerhard itself): a December night, not a shirt. Painted over the figure's own textures by Grenzland's GLFIG.dress, as
  // its flashback does; given back with the layer. ----
  async function dressPlayer() {
    const A = window.AVATAR,
      G2 = window.GLFIG,
      D = window.GLDATA;
    if (!A || A.failed || !window.PLAYERMAN || !G2 || !G2.dress || !G2.pixels || !D || !D.KLEID) return;
    const kind = A.kind,
      Fg = A.figs && A.figs[kind],
      file = A.FIGS && A.FIGS[kind] && A.FIGS[kind].file;
    if (!Fg || !Fg.model || !file) return;
    for (const [n, v] of Object.entries(KLEID89)) if (!D.KLEID[n]) D.KLEID[n] = v;
    const K = D.KLEID[kind === 'f' ? 's89steppblau' : kind === 'c' ? 's89steppbraun' : 'parka'];
    const R = { restore: [], tex: [] };
    try {
      await G2.pixels(Fg.model, window.PLAYERMAN[file]);
      if (!S.on || !S.built) return G2.forget(Fg.model);
      R.tex = G2.dress(Fg.model, K, R.restore);
      G2.forget(Fg.model);
    } catch (e) {
      S.err = 'Spieler: ' + String((e && e.message) || e);
      return;
    }
    S.dressed = kind;
    undo.push(() => {
      for (const [m, map] of R.restore) {
        m.map = map;
        m.needsUpdate = true;
      }
      for (const t of R.tex) t.dispose();
      S.dressed = '';
    });
    markDirty(true);
  }

  function build() {
    const L = street();
    if (L.length < 1) {
      S.wait = 'Hölderlinstraße'; // not loaded yet (or not in this set): tried again every 2 s
      return false;
    }
    S.wait = '';
    fence(L);
    const spots = crowd(L);
    const list = spots.map((p, i) => {
      const r = hh(i * 7.3 + 1),
        // facing the gate, a little turned each
        hd = Math.atan2(GATE[0] - p.x, GATE[1] - p.y) + (hh(i * 3.1) - 0.5) * 0.9;
      return {
        x: p.x,
        y: p.y,
        z: p.z,
        hd,
        s: 0.93 + hh(i * 1.9) * 0.14,
        coat: pick(COATS, r),
        legs: LEGS[Math.floor(hh(i * 5.7) * LEGS.length)],
        skin: SKIN[Math.floor(hh(i * 2.3) * SKIN.length)],
        cap: hh(i * 4.1) < 0.45 ? CAPS[Math.floor(hh(i * 6.1) * CAPS.length)] : null,
        hair: HAIR[Math.floor(hh(i * 9.7) * HAIR.length)],
        candle: hh(i * 8.9) < 0.42,
        demo: true,
      };
    });
    // the Volkspolizei: a few inside the gate, in a loose row
    for (let k = 0; k < 6; k++) {
      const gx = GATE[0] + INWARD[0] * 6,
        gy = GATE[1] + INWARD[1] * 6,
        o = (k - 2.5) * 1.4,
        x = gx + -INWARD[1] * o,
        y = gy + INWARD[0] * o;
      list.push({
        x,
        y,
        z: gz(x, y),
        hd: Math.atan2(-INWARD[0], -INWARD[1]),
        s: 1.02,
        coat: VP,
        legs: '#3a4236',
        skin: SKIN[k % SKIN.length],
        cap: '#3c4634',
        candle: false,
      });
    }
    figures(list);
    hashUp(list);
    S.list = list;
    S.people = list.length;
    S.candles = list.filter(f => f.candle).length;
    // banners over the crowd, near the gate first, one per 9 m (each one kept against those already taken – compared with every
    // spot before it in the dense crowd, only the first ever stood)
    const bs = [];
    for (const p of spots.filter(p => p.d > 7 && p.d < 80).sort((a, b) => a.d - b.d)) {
      if (bs.length >= SLOGANS.length) break;
      if (bs.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 9)) bs.push(p);
    }
    bs.forEach((p, i) => banner(SLOGANS[i], p.x, p.y, Math.atan2(GATE[0] - p.x, GATE[1] - p.y), 2.6));
    S.bannerAt = bs.map(p => [p.x, p.y]);
    S.streetL = L;
    // cars of the time further down the streets (Grenzland's models), parked along the kerb
    const GA = window.GLAUTO;
    if (GA && GA.spawn && GA.park) {
      const types = ['trabant', 'trabant', 'trabant_kombi', 'wartburg', 'trabant', 'barkas', 'wartburg', 'trabant'],
        old = { trabant: 'klein89', trabant_kombi: 'klein89', wartburg: 'limo89', barkas: 'kasten89' };
      const far = L.filter(([ax, ay, bx, by]) => {
        const d = Math.hypot((ax + bx) / 2 - GATE[0], (ay + by) / 2 - GATE[1]),
          l = Math.hypot(bx - ax, by - ay);
        return d > 95 && d < 170 && l > 6;
      });
      for (let k = 0; k < far.length && S.cars < 10; k++) {
        const [ax, ay, bx, by, w] = far[k],
          hd = Math.atan2(bx - ax, by - ay),
          rx = Math.cos(hd),
          ry = -Math.sin(hd),
          x = (ax + bx) / 2 + rx * (w / 2 - 0.9),
          y = (ay + by) / 2 + ry * (w / 2 - 0.9),
          ty = types[S.cars % types.length];
        try {
          const c = GA.spawn(ty, {}) || GA.spawn(old[ty] || 'klein89', {});
          if (!c) continue;
          GA.park(c, x, y, hd);
          undo.push(() => GA.remove && GA.remove(c));
          S.cars++;
        } catch (e) {
          S.err = 'Autos: ' + String((e && e.message) || e);
          break;
        }
      }
    }
    scene.add(G);
    S.built = true;
    if (S.spieler) dressPlayer();
    markDirty(true);
    return true;
  }
  function clear() {
    nearDrop();
    S.list = null;
    HASH = null;
    WALLS.length = 0;
    giving.clear();
    candleKit = null;
    scene.remove(G);
    G.traverse(o => {
      if (o.geometry) o.geometry.dispose();
    });
    G.clear();
    for (const m of mats) {
      if (m.map) m.map.dispose();
      m.dispose();
    }
    mats = [];
    for (const f of undo.reverse()) {
      try {
        f();
      } catch (e) {}
    }
    undo = [];
    Object.assign(S, { built: false, people: 0, candles: 0, banners: 0, cars: 0, fence: 0 });
    markDirty(true);
  }
  S.set = (on, o = {}) => {
    on = !!on;
    if (on && o.spieler) S.spieler = true;
    if (on === S.on && !o.again) return S.state();
    S.on = on;
    C.jahr(on ? 1989 : 0);
    if (!on) {
      S.nacht = null;
      S.spieler = false;
      clear();
      buses(false);
      return S.state();
    }
    // a look without the mission: the evening of Monday, 4 December 1989, half past eight (the game's day becomes that date, as
    // Grenzland's flashback does it: DN.e0)
    if (o.nacht && window.CLOCK) {
      const CL = window.CLOCK,
        DN = window.DN,
        t0 = CL.t,
        e0 = DN ? DN.e0 : null,
        d = Math.floor(CL.t / 1440);
      undo.push(() => {
        if (CL.unfocus) CL.unfocus('suhl1989');
        CL.t = t0;
        if (DN && e0 !== null) DN.e0 = e0;
      });
      try {
        if (DN) DN.e0 = Date.UTC(1989, 11, 4) / 864e5 - d;
      } catch (e) {}
      CL.t = d * 1440 + 20.5 * 60;
      // the night stays: the clock in real time while the layer is on (by default an hour of play passes in a minute), and back to
      // half past eight on that day should it pass eleven anyway (a time-lapse, a jump of the clock)
      if (CL.focus) CL.focus('suhl1989');
      S.nacht = d;
    }
    S.retry = 0;
    return S.state();
  };
  // built once the street is there (the tiles of s near the gate); the flames and the sway run with the clock
  S.tick = dt => {
    if (!S.on) return;
    S.t += dt;
    if (S.nacht !== undefined && S.nacht !== null && window.CLOCK) {
      const CL = window.CLOCK,
        m = CL.t - S.nacht * 1440;
      if (m < 19 * 60 || m > 23 * 60) CL.t = S.nacht * 1440 + 20.5 * 60;
    }
    if (!S.built && (S.retry = (S.retry || 0) - dt) <= 0) {
      S.retry = 2;
      build();
    }
    if (S.u) {
      S.u.uT.value = S.t;
      markDirty();
    }
    buses(true);
    if (S.built) {
      giveTick(dt);
      nearTick(dt);
    }
  };
  S.leave = () => {
    if (S.built) clear();
    buses(false);
  };
  S.state = () => ({
    on: S.on,
    built: S.built,
    people: S.people,
    candles: S.candles,
    banners: S.banners,
    fence: S.fence || 0,
    cars: S.cars,
    wait: S.wait || '',
    real: NEAR.figs.length,
    vp: NEAR.vp.filter(n => n.F).length,
    realPlaced: NEAR.figs.filter(n => n.spot).length,
    walls: WALLS.length,
    dressed: S.dressed || '',
    giving: giving.size,
    buses: BH.on,
    err: S.err || NEAR.err,
  });
  // for the tests (test/suhl.py jahr1989, the inspections): where people and walls are, who gives way
  S.dbg = () => ({
    walls: WALLS.map(w => w.map(v => +v.toFixed(2))),
    spots: (S.list || []).map(f => [
      +f.x.toFixed(2),
      +f.y.toFixed(2),
      +(f.ox || 0).toFixed(3),
      +(f.oy || 0).toFixed(3),
      f.demo ? 1 : 0,
    ]),
    wk: [WK.x, WK.y, WK.vx, WK.vy],
    banners: (S.bannerAt || []).map(b => b.map(v => +v.toFixed(2))),
    street: (S.streetL || []).map(w => w.map(v => +v.toFixed(2))),
  });
  return S;
}
