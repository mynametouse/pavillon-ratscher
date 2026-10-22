// ---------- interior styles of the pavilion: floor, walls, ceiling, furniture wood and fabrics – presets and single choices (remembered per browser, part of the published plan) ----------
const STYLE = (() => {
  const G = (m, d = 0, c = 0xffffff, k = 0) => {
    const U = m.userData.grade;
    if (!U) return;
    U.d.value = d;
    U.c.value.set(c);
    U.k.value = k;
  };
  const PARTS = ['floorP', 'clay', 'ceilP', 'furnP', 'linenP', 'sageP', 'rustP', 'woolP', 'rugP'],
    ORIG = {};
  for (const k of PARTS) {
    const m = MAT[k];
    ORIG[k] = {
      map: m.map,
      normalMap: m.normalMap,
      roughnessMap: m.roughnessMap,
      aoMap: m.aoMap,
      color: m.color.clone(),
      roughness: m.roughness,
    };
  }
  const reset = k => {
    const m = MAT[k],
      o = ORIG[k];
    if (o.map) {
      m.map = o.map;
      m.normalMap = o.normalMap;
      m.roughnessMap = o.roughnessMap;
      m.aoMap = o.aoMap;
    }
    m.color.copy(o.color);
    m.roughness = o.roughness;
    G(m);
    return m;
  };
  const tone = (k, d, c, kk, rough) => () => {
    const m = reset(k);
    G(m, d, c, kk);
    if (rough != null) m.roughness = rough;
  };
  // each choice: [label, swatch colour(s), apply]
  const OPT = {
    floor: {
      oak: ['Eiche natur', '#a77b52', () => reset('floorP')],
      white: ['Eiche weiß geölt', '#e3d9c9', tone('floorP', 0.35, 0xefe6d8, 0.55)],
      ash: ['Esche hell', '#d9c8a6', tone('floorP', 0.2, 0xdcc9a4, 0.4)],
      smoked: ['Eiche geräuchert', '#6e5039', tone('floorP', 0.15, 0x5f4431, 0.5)],
      walnut: ['Nussbaum', '#5b3d2a', tone('floorP', 0.1, 0x4f3524, 0.58)],
      conc: [
        'Beton geschliffen',
        '#a9a59d',
        () => {
          const m = reset('floorP'),
            c = MAT.conc;
          if (!c.map) {
            G(m, 0.9, 0xa9a59d, 0.85);
            return;
          }
          m.map = c.map;
          m.normalMap = c.normalMap;
          m.roughnessMap = c.roughnessMap;
          m.aoMap = c.aoMap;
          m.color.set(0xd8d4cc);
          m.roughness = 0.85;
        },
      ],
    },
    walls: {
      clay: ['Lehmputz natur', '#e6dac6', () => reset('clay')],
      lime: ['Kalkputz weiß', '#f2efe8', tone('clay', 0.5, 0xf4f1ea, 0.72)],
      sand: ['Lehm sandig', '#d3bf9d', tone('clay', 0, 0xcdb690, 0.4)],
      green: ['Grün gekalkt', '#5d7360', tone('clay', 0.2, 0x55705b, 0.72)],
      terra: ['Terrakotta', '#b36a4a', tone('clay', 0.15, 0xae6347, 0.66)],
      grey: ['Grau', '#a8a7a2', tone('clay', 0.6, 0xa6a59f, 0.68)],
    },
    ceil: {
      larch: ['Lärche natur', '#d2ab7a', () => reset('ceilP')],
      white: ['Weiß lasiert', '#f1ebe0', tone('ceilP', 0.3, 0xf2ece2, 0.62)],
      dark: ['Dunkel gebeizt', '#4c3b2d', tone('ceilP', 0.2, 0x45362a, 0.66)],
      black: ['Schwarz', '#2f2d2b', tone('ceilP', 0.5, 0x2b2927, 0.82)],
    },
    wood: {
      oak: ['Eiche geölt', '#c49a70', () => reset('furnP')],
      birch: ['Birke hell', '#e6d4b6', tone('furnP', 0.25, 0xe9d8bb, 0.45)],
      walnut: ['Nussbaum', '#6b4a33', tone('furnP', 0.1, 0x5c402e, 0.56)],
      black: ['Schwarz gebeizt', '#3a3632', tone('furnP', 0.4, 0x33302c, 0.72)],
    },
    fabric: {
      natur: ['Leinen & Salbei', ['#f4eee4', '#93a084', '#d07b55'], null],
      hell: [
        'Hell & ruhig',
        ['#f3f0e9', '#b7c3c8', '#d8c2a3'],
        [0xf3f0e9, 0xb7c3c8, 0xd8c2a3, 0xc9c6c0, 0xece6da, 0xe7e2d8, 0xb7c3c8],
      ],
      indigo: [
        'Indigo & Natur',
        ['#ddd3c1', '#3f4d68', '#3b3a38'],
        [0xddd3c1, 0x3f4d68, 0x3b3a38, 0x8a857c, 0xc9b98b, 0x3f4d68, 0xddd3c1],
      ],
      warm: [
        'Cognac & Flaschengrün',
        ['#e6dcc6', '#2f4a3c', '#9a5a32'],
        [0xe6dcc6, 0x2f4a3c, 0x9a5a32, 0x6e5a48, 0x7a3a32, 0x9a5a32, 0x2f4a3c],
      ],
      grau: [
        'Grau & Senf',
        ['#c9c7c3', '#2f5661', '#c29a3a'],
        [0xc9c7c3, 0x2f5661, 0xc29a3a, 0x4b4b4b, 0x8f8b85, 0x4b4b4b, 0xc29a3a],
      ],
    },
  };
  function fabric(key) {
    const f = OPT.fabric[key];
    const cols = f && f[2];
    const parts = ['linenP', 'sageP', 'rustP', 'woolP', 'rugP'];
    parts.forEach((k, i) => {
      const m = reset(k);
      if (cols) {
        m.color.set(cols[i]);
        G(m, 0.15, 0xffffff, 0);
      }
    });
    for (const [role, i] of [
      ['a', 5],
      ['b', 6],
    ])
      for (const m of (window.CUSH || {})[role] || []) m.color.set(cols ? cols[i] : m.userData.col0);
  }
  const PRESET = {
    natur: ['Natur (Entwurf)', { floor: 'oak', walls: 'clay', ceil: 'larch', wood: 'oak', fabric: 'natur' }],
    nord: ['Hell nordisch', { floor: 'white', walls: 'lime', ceil: 'white', wood: 'birch', fabric: 'hell' }],
    japan: ['Japanisch', { floor: 'ash', walls: 'sand', ceil: 'dark', wood: 'walnut', fabric: 'indigo' }],
    club: ['Warm & dunkel', { floor: 'walnut', walls: 'green', ceil: 'dark', wood: 'walnut', fabric: 'warm' }],
    loft: ['Industrie', { floor: 'conc', walls: 'grey', ceil: 'black', wood: 'black', fabric: 'grau' }],
  };
  const DEF = { style: 'natur', floor: 'oak', walls: 'clay', ceil: 'larch', wood: 'oak', fabric: 'natur' };
  let state = Object.assign({}, DEF);
  try {
    const j = JSON.parse(SAVE.raw('pav-style') || 'null');
    if (j) state = Object.assign(state, j);
  } catch (e) {}
  function setPart(part, key, save = true) {
    const o = OPT[part] && OPT[part][key];
    if (!o) return;
    if (part === 'fabric') fabric(key);
    else o[2]();
    state[part] = key;
    if (save) {
      const p = PRESET[state.style];
      if (p && p[1][part] !== key) state.style = 'eigen';
      store();
    }
  }
  function setStyle(key) {
    const p = PRESET[key];
    if (!p) return;
    for (const [part, k] of Object.entries(p[1])) setPart(part, k, false);
    state.style = key;
    store();
  }
  function store() {
    try {
      SAVE.setRaw('pav-style', JSON.stringify(state));
    } catch (e) {}
    sync();
    markDirty(true);
    if (window.SITEPLAN) SITEPLAN.changed();
  }
  function applyAll(st) {
    st = Object.assign({}, DEF, st || {});
    for (const part of Object.keys(OPT)) setPart(part, st[part], false);
    state.style = st.style;
    store();
  }
  function sync() {
    document
      .querySelectorAll('#interior [data-sk]')
      .forEach(b => b.setAttribute('aria-pressed', state[b.dataset.sp] === b.dataset.sk ? 'true' : 'false'));
  }
  function build() {
    const box = $('interior');
    if (!box) return;
    const sw = c => (Array.isArray(c) ? `linear-gradient(90deg,${c[0]} 0 34%,${c[1]} 34% 67%,${c[2]} 67%)` : c);
    const add = (part, entries) => {
      const row = box.querySelector(`[data-st="${part}"]`);
      if (!row) return;
      for (const [k, label, c, fn] of entries) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.sp = part;
        b.dataset.sk = k;
        b.innerHTML = `<i style="background:${sw(c)}"></i>${label}`;
        b.addEventListener('click', fn);
        row.appendChild(b);
      }
    };
    add(
      'style',
      Object.entries(PRESET).map(([k, [label, p]]) => [
        k,
        label,
        [OPT.floor[p.floor][1], OPT.walls[p.walls][1], OPT.fabric[p.fabric][1][1]],
        () => setStyle(k),
      ])
    );
    for (const part of Object.keys(OPT))
      add(
        part,
        Object.entries(OPT[part]).map(([k, [label, c]]) => [k, label, c, () => setPart(part, k)])
      );
    const btn = $('intbtn');
    if (btn)
      btn.addEventListener('click', () => {
        const open = box.hidden;
        box.hidden = !open;
        btn.setAttribute('aria-pressed', open ? 'true' : 'false');
        if (open) {
          const f = $('facade');
          if (f && !f.hidden) {
            f.hidden = true;
            const fb = $('facbtn');
            if (fb) fb.setAttribute('aria-pressed', 'false');
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
  if (JSON.stringify(state) !== JSON.stringify(DEF)) {
    const st = state;
    for (const part of Object.keys(OPT)) setPart(part, st[part], false);
    sync();
  }
  const cushCol = (role, col0) => {
    const f = OPT.fabric[state.fabric],
      cols = f && f[2];
    return cols ? cols[role === 'b' ? 6 : 5] : col0;
  }; // for chair upholstery that loads later
  return { setStyle, setPart, applyAll, cushCol, state: () => Object.assign({}, state), OPT, PRESET };
})();
window.STYLE = STYLE;
