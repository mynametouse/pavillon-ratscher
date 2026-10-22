// ---------- facade options: material and colour of the cladding, separately for house and tower, plus window frames (remembered per browser) ----------
const FACADE = (() => {
  const save0 = m => ({
    map: m.map,
    normalMap: m.normalMap,
    roughnessMap: m.roughnessMap,
    aoMap: m.aoMap,
    metalnessMap: m.metalnessMap,
    color: m.color.clone(),
    roughness: m.roughness,
    metalness: m.metalness,
    ns: m.normalScale.clone(),
    env: m.envMapIntensity,
  });
  const ORIG = { house: save0(MAT.char), tower: save0(MAT.charT), frame: save0(MAT.frame) };
  const L = MAT.larch,
    MT = MAT.metal;
  // options never remove a texture slot (a material without a map is a different shader → a compile stall on click); plain colours use 1×1 textures
  const px1 = (r, g, b, srgb) => {
    const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const WHITE_C = px1(255, 255, 255, true),
    WHITE_D = px1(255, 255, 255, false);
  const cortenTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#93502b';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const k = rnd();
      g.fillStyle = k < 0.5 ? `rgba(60,28,14,${0.12 + rnd() * 0.25})` : `rgba(170,92,48,${0.1 + rnd() * 0.25})`;
      const r = rr(1, 9);
      g.beginPath();
      g.ellipse(rnd() * 256, rnd() * 256, r, r * rr(0.4, 1), rnd() * 3, 0, 7);
      g.fill();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(40,20,10,0.18)';
      g.fillRect(rnd() * 256, 0, rr(1, 3), 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(0.8, 0.8);
    t.anisotropy = ANISO;
    return t;
  })();
  // painted textures for more claddings (u = horizontal metres, v = vertical metres on the walls)
  const ctex = (px, py, rep, draw) => {
    const c = document.createElement('canvas');
    c.width = px;
    c.height = py;
    draw(c.getContext('2d'), px, py);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    t.repeat.set(rep[0], rep[1]);
    return t;
  };
  const noise = (q, w, h, n, a, light) => {
    for (let i = 0; i < n; i++) {
      q.fillStyle = light ? `rgba(255,255,255,${rnd() * a})` : `rgba(0,0,0,${rnd() * a})`;
      q.fillRect(rnd() * w, rnd() * h, rr(1, 3), rr(1, 3));
    }
  };
  let TX = null;
  const tex = () =>
    TX ||
    (TX = {
      shingle: ctex(512, 512, [1, 1 / 0.96], (q, w, h) => {
        const rows = 8,
          rh = h / rows;
        for (let r = 0; r < rows; r++) {
          let x = -rnd() * 40;
          const y = r * rh; // weathered larch shingles, 12 cm rows
          while (x < w) {
            const sw = rr(36, 92),
              g = 0.75 + rnd() * 0.35,
              grey = rnd() < 0.35;
            q.fillStyle = grey
              ? `rgb(${Math.round(128 * g)},${Math.round(122 * g)},${Math.round(112 * g)})`
              : `rgb(${Math.round(142 * g)},${Math.round(108 * g)},${Math.round(76 * g)})`;
            for (const dx of [0, w]) {
              q.fillRect(x + dx + 1, y, sw - 2, rh);
              q.fillRect(x - w + 1, y, sw - 2, rh);
            }
            q.fillStyle = 'rgba(0,0,0,0.5)';
            for (const dx of [0, w, -w]) q.fillRect(x + dx + sw - 2, y, 2, rh);
            x += sw;
          }
          const gr = q.createLinearGradient(0, y + rh - 10, 0, y + rh);
          gr.addColorStop(0, 'rgba(0,0,0,0)');
          gr.addColorStop(1, 'rgba(0,0,0,0.55)');
          q.fillStyle = gr;
          q.fillRect(0, y + rh - 10, w, 10);
        }
        for (let i = 0; i < 1800; i++) {
          q.strokeStyle = `rgba(40,30,20,${rnd() * 0.18})`;
          q.beginPath();
          const x = rnd() * w,
            y = rnd() * h;
          q.moveTo(x, y);
          q.lineTo(x + rr(-1, 1), y + rr(8, 30));
          q.stroke();
        }
      }),
      lap: ctex(512, 512, [1, 1 / 0.96], (q, w, h) => {
        const n = 6,
          bh = h / n;
        for (let b = 0; b < n; b++) {
          const y = b * bh,
            gr = q.createLinearGradient(0, y, 0, y + bh);
          gr.addColorStop(0, '#f6f4ef');
          gr.addColorStop(0.85, '#e6e2da');
          gr.addColorStop(1, '#bdb8ae');
          q.fillStyle = gr;
          q.fillRect(0, y, w, bh); // white lap siding, 16 cm boards
          q.fillStyle = 'rgba(0,0,0,0.4)';
          q.fillRect(0, y + bh - 3, w, 3);
        }
        noise(q, w, h, 2500, 0.05, false);
      }),
      fibre: ctex(512, 512, [1 / 2.5, 1 / 2.5], (q, w, h) => {
        q.fillStyle = '#4b4e52';
        q.fillRect(0, 0, w, h);
        noise(q, w, h, 9000, 0.06, true);
        noise(q, w, h, 6000, 0.08, false); // fibre cement panels 1,25 m, open joints
        q.fillStyle = '#26282a';
        for (const x of [0, w / 2]) q.fillRect(x - 3, 0, 6, h);
        q.fillRect(0, 0, w, 6);
        q.fillStyle = '#8d9196';
        for (const x of [w * 0.06, w * 0.44, w * 0.56, w * 0.94])
          for (const y of [h * 0.08, h * 0.5, h * 0.92]) {
            q.beginPath();
            q.arc(x, y, 3, 0, 7);
            q.fill();
          }
      }),
      copper: ctex(512, 512, [1, 1], (q, w, h) => {
        q.fillStyle = '#6f9e8c';
        q.fillRect(0, 0, w, h);
        for (let i = 0; i < 2200; i++) {
          const k = rnd();
          q.fillStyle =
            k < 0.45
              ? `rgba(84,134,118,${0.15 + rnd() * 0.3})`
              : k < 0.9
                ? `rgba(150,190,172,${0.12 + rnd() * 0.3})`
                : `rgba(140,92,58,${0.2 + rnd() * 0.3})`; // patinated copper, standing seams every 50 cm
          const r = rr(2, 12);
          q.beginPath();
          q.ellipse(rnd() * w, rnd() * h, r * 0.5, r * 1.6, 0, 0, 7);
          q.fill();
        }
        for (const x of [0, w / 2]) {
          q.fillStyle = 'rgba(30,50,44,0.55)';
          q.fillRect(x - 4, 0, 4, h);
          q.fillStyle = 'rgba(210,235,225,0.5)';
          q.fillRect(x, 0, 3, h);
        }
      }),
      lime: ctex(512, 512, [1 / 1.5, 1 / 1.5], (q, w, h) => {
        q.fillStyle = '#e6e0d4';
        q.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          q.fillStyle = rnd() < 0.5 ? `rgba(255,255,250,${rnd() * 0.12})` : `rgba(150,140,120,${rnd() * 0.08})`;
          const r = rr(6, 40);
          q.beginPath();
          q.ellipse(rnd() * w, rnd() * h, r, r * rr(0.5, 1), rnd() * 3, 0, 7);
          q.fill();
        }
        noise(q, w, h, 4000, 0.06, false);
      }),
    });
  const painted =
    (key, rough, metal = 0, nrm = L.normalMap, ns = 0.35, env = 0.8) =>
    m => {
      grade(m);
      const T = tex();
      m.map = T[key];
      m.normalMap = nrm || L.normalMap;
      m.roughnessMap = WHITE_D;
      m.aoMap = L.aoMap;
      m.metalnessMap = null;
      m.color.set(0xffffff);
      m.roughness = rough;
      m.metalness = metal;
      m.normalScale.set(ns, ns);
      m.envMapIntensity = env;
    };
  // each option: [label, swatch colour, setter(material, original)]
  const grade = (m, d = 0, c = 0xffffff, k = 0) => {
    const G = m.userData.grade;
    if (!G) return;
    G.d.value = d;
    G.c.value.set(c);
    G.k.value = k;
  };
  const wood =
    (col, ns = 0.8, rough = 0.85, g = [0, 0xffffff, 0]) =>
    m => {
      m.map = L.map;
      m.normalMap = L.normalMap;
      m.roughnessMap = L.roughnessMap;
      m.aoMap = L.aoMap;
      m.metalnessMap = null;
      m.color.set(col);
      m.roughness = rough;
      m.metalness = 0;
      m.normalScale.set(ns, ns);
      m.envMapIntensity = 0.8;
      grade(m, ...g);
    };
  const paint = col => m => {
    grade(m);
    m.map = WHITE_C;
    m.normalMap = L.normalMap;
    m.roughnessMap = WHITE_D;
    m.aoMap = L.aoMap;
    m.metalnessMap = null;
    m.color.set(col);
    m.roughness = 0.72;
    m.metalness = 0;
    m.normalScale.set(0.45, 0.45);
    m.envMapIntensity = 0.75;
  };
  const OPTS = {
    yakisugi: [
      'Yakisugi (geflammt)',
      '#1f1c1a',
      (m, o) => {
        grade(m);
        Object.assign(m, {
          map: o.map,
          normalMap: o.normalMap,
          roughnessMap: o.roughnessMap,
          aoMap: o.aoMap,
          metalnessMap: o.metalnessMap,
          roughness: o.roughness,
          metalness: o.metalness,
          envMapIntensity: o.env,
        });
        m.color.copy(o.color);
        m.normalScale.copy(o.ns);
      },
    ],
    larch: ['Lärche natur', '#c39a66', wood(0xffffff)],
    silver: ['Lärche vergraut', '#9b9890', wood(0xffffff, 0.9, 0.95, [0.9, 0x9d9b95, 0.42])],
    red: ['Schwedenrot', '#8b2f22', paint(0x8b2f22)],
    green: ['Tannengrün', '#2f4a3a', paint(0x2f4a3a)],
    blue: ['Taubenblau', '#5d7286', paint(0x5d7286)],
    anthr: ['Anthrazit lasiert', '#35383b', wood(0xffffff, 0.8, 0.8, [0.75, 0x2c2f32, 0.62])],
    ochre: ['Ocker', '#c58f3e', paint(0xc58f3e)],
    white: ['Weiß', '#e9e6de', paint(0xe9e6de)],
    zinc: [
      'Zinkblech',
      '#a9afb4',
      m => {
        grade(m);
        m.map = MT.map;
        m.normalMap = MT.normalMap;
        m.roughnessMap = MT.roughnessMap;
        m.aoMap = MT.aoMap;
        m.metalnessMap = null;
        m.color.set(0xb4b9bd);
        m.roughness = 0.55;
        m.metalness = 0.65;
        m.normalScale.set(0.8, 0.8);
        m.envMapIntensity = 1.0;
      },
    ],
    corten: [
      'Cortenstahl',
      '#8f4a28',
      m => {
        grade(m);
        m.map = cortenTex;
        m.normalMap = MT.normalMap;
        m.roughnessMap = WHITE_D;
        m.aoMap = MT.aoMap;
        m.metalnessMap = null;
        m.color.setRGB(1.1, 1.02, 0.98);
        m.roughness = 0.82;
        m.metalness = 0.08;
        m.normalScale.set(0.6, 0.6);
        m.envMapIntensity = 0.8;
      },
    ],
    shingle: ['Holzschindeln', '#8a6d50', painted('shingle', 0.9, 0, L.normalMap, 0.55, 0.7)],
    lap: ['Stülpschalung weiß', '#ece9e2', painted('lap', 0.72, 0, L.normalMap, 0.3, 0.8)],
    fibre: ['Faserzement anthrazit', '#4b4e52', painted('fibre', 0.8, 0, L.normalMap, 0.12, 0.75)],
    copper: ['Kupfer patiniert', '#6f9e8c', painted('copper', 0.55, 0.3, MT.normalMap, 0.3, 1.0)],
    lime: ['Kalkputz', '#e6e0d4', painted('lime', 0.95, 0, MAT.clay.normalMap, 0.8, 0.75)],
  };
  const FRAME = {
    larch: [
      'Lärche geölt',
      '#c9a27a',
      (m, o) => {
        Object.assign(m, {
          map: o.map,
          normalMap: o.normalMap,
          roughnessMap: o.roughnessMap,
          roughness: o.roughness,
          metalness: o.metalness,
        });
        m.color.copy(o.color);
      },
    ],
    black: [
      'Schwarz',
      '#222222',
      m => {
        m.map = WHITE_C;
        m.roughnessMap = WHITE_D;
        m.color.set(0x252525);
        m.roughness = 0.55;
        m.metalness = 0.1;
      },
    ],
    white: [
      'Weiß',
      '#ece9e2',
      m => {
        m.map = WHITE_C;
        m.roughnessMap = WHITE_D;
        m.color.set(0xece9e2);
        m.roughness = 0.6;
        m.metalness = 0;
      },
    ],
    green: [
      'Grün',
      '#3c5545',
      m => {
        m.map = WHITE_C;
        m.roughnessMap = WHITE_D;
        m.color.set(0x3c5545);
        m.roughness = 0.6;
        m.metalness = 0;
      },
    ],
    anthr: [
      'Anthrazit',
      '#3b3e41',
      m => {
        m.map = WHITE_C;
        m.roughnessMap = WHITE_D;
        m.color.set(0x3b3e41);
        m.roughness = 0.5;
        m.metalness = 0.2;
      },
    ],
    oakdark: [
      'Eiche dunkel',
      '#6e5039',
      (m, o) => {
        Object.assign(m, {
          map: o.map,
          normalMap: o.normalMap,
          roughnessMap: o.roughnessMap,
          roughness: o.roughness,
          metalness: o.metalness,
        });
        m.color.set(0x7a5a40);
      },
    ],
  };
  const MATS_OF = { house: MAT.char, tower: MAT.charT, frame: MAT.frame };
  let state = { house: 'yakisugi', tower: 'yakisugi', frame: 'larch' };
  try {
    const j = JSON.parse(SAVE.raw('pav-facade') || 'null');
    if (j) state = Object.assign(state, j);
  } catch (e) {}
  function apply(target, key) {
    const set = target === 'frame' ? FRAME : OPTS;
    if (!set[key]) return;
    const m = MATS_OF[target];
    set[key][2](m, ORIG[target]);
    m.needsUpdate = true;
    state[target] = key;
    try {
      SAVE.setRaw('pav-facade', JSON.stringify(state));
    } catch (e) {}
    sync();
    markDirty(true);
  }
  function sync() {
    document
      .querySelectorAll('#facade [data-fk]')
      .forEach(b => b.setAttribute('aria-pressed', state[b.dataset.ft] === b.dataset.fk ? 'true' : 'false'));
  }
  function build() {
    const box = $('facade');
    if (!box) return;
    for (const [target, set] of [
      ['house', OPTS],
      ['tower', OPTS],
      ['frame', FRAME],
    ]) {
      const row = box.querySelector(`[data-fac="${target}"]`);
      if (!row) continue;
      for (const [k, [label, sw]] of Object.entries(set)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.ft = target;
        b.dataset.fk = k;
        b.innerHTML = `<i style="background:${sw}"></i>${label}`;
        b.addEventListener('click', () => apply(target, k));
        row.appendChild(b);
      }
    }
    const btn = $('facbtn');
    if (btn)
      btn.addEventListener('click', () => {
        box.hidden = !box.hidden;
        btn.setAttribute('aria-pressed', box.hidden ? 'false' : 'true');
        if (!box.hidden) {
          const i = $('interior');
          if (i && !i.hidden) {
            i.hidden = true;
            const ib = $('intbtn');
            if (ib) ib.setAttribute('aria-pressed', 'false');
          }
        }
      });
    const x = box.querySelector('.x');
    if (x)
      x.addEventListener('click', () => {
        box.hidden = true;
        btn && btn.setAttribute('aria-pressed', 'false');
      });
    sync();
  }
  build();
  for (const t of ['house', 'tower', 'frame'])
    if (state[t] !== (t === 'frame' ? 'larch' : 'yakisugi')) apply(t, state[t]);
  return { apply, state: () => Object.assign({}, state), OPTS: Object.keys(OPTS), FRAME: Object.keys(FRAME) };
})();
window.FACADE = FACADE;
