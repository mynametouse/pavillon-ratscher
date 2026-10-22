// ===================== V14 quests: four tasks with the neighbours and in the workshop; journal (J), tracker with distance and arrow, =====================
// a marker over the goal; progress is kept in this browser. Builds on 23_play (acts, things in the hand, seats) and the neighbours (16_npc).
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { SAVE } from '../core/save.js';
import { $, OFFLINE, QS, scene, V } from '../core/head.js';
import { LOAD, loadModel, markDirty, plain, whenLoaded } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, BUILD, phase, PHN } from '../core/geo.js';
import { mulberry } from '../garden/grass.js';
import { DOOR, G, P, PHASE, poseDoor, toggleDoor } from './walkable.js';
import { audio, toast } from '../audio/audio.js';
import {
  bleat,
  GOATS,
  headingTo,
  inView,
  lerpAngle,
  NM,
  NPCS,
  PAD,
  startDrive,
  TRACTOR,
  TRACTOR_HOME,
} from '../npc/npc.js';
import { PLAN } from '../pavilion/plan.js';
import { HELD, PLAY, SFX } from './play.js';
import { STOVE } from './home.js';
import { PIANO } from '../audio/music.js';
phase(null);
export const QUESTS = (() => {
  const LSK = 'pav-quests-v1',
    LS = {
      get() {
        try {
          return JSON.parse(SAVE.raw(LSK) || 'null');
        } catch (e) {
          return null;
        }
      },
      set(v) {
        try {
          SAVE.setRaw(LSK, JSON.stringify(v));
        } catch (e) {}
      },
      del() {
        try {
          SAVE.del(LSK);
        } catch (e) {}
      },
    };
  const Q = {
    goat: { st: 'new', fed: [] },
    fire: { st: 'new', chopped: 0 },
    diesel: { st: 'new', empty: false, thanked: false },
    board: { st: 'new', shown: false },
  };
  let track = 'goat';
  const TITLES = {
    goat: 'Futter für die Ziegen',
    fire: 'Feuer im Ofen',
    diesel: 'Diesel für Günter',
    board: 'Ein Brett für Bernd',
  };
  const WHO = { goat: 'Bernd', fire: 'Bibliothek', diesel: 'Günter', board: 'Bernd · Werkstatt' };
  const ON = !OFFLINE && !QS.get('noplay');
  const R = () => NPCS.bernd,
    H = () => NPCS.guenter,
    goat = n => GOATS.find(g => g.gname === n),
    FRIEDA = () => goat('Frieda');
  const near = (w, d) => w && Math.hypot(P.x - w.x, P.y - w.y) < d;
  const WT = (x, y) => (window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]); // workshop coordinates → where the workshop stands now
  const WDA = () => ((window.BUILD && BUILD.werkstatt ? BUILD.werkstatt.da : 0) * Math.PI) / 180;
  const saidAt = {};
  function bark(w, id, gap = 40) {
    if (!w || !audio) return;
    const now = performance.now() / 1000;
    if (now - (saidAt[id] || -1e9) < gap) return;
    saidAt[id] = now;
    w.sayId(w.name + '_' + id);
  }
  // ---------------- props ----------------
  const hayMat = NM.hay,
    splitMat = plain({ color: 0xd9b88c, roughness: 0.85 }),
    endMat = MAT.logEnd;
  function hayBundle(s = 1) {
    const g = new THREE.Group();
    const R0 = mulberry(7);
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13 + R0() * 0.06, 10, 8), hayMat);
      m.position.set((R0() - 0.5) * 0.28, (R0() - 0.5) * 0.1, (R0() - 0.5) * 0.18);
      m.scale.set(1.2, 0.55, 0.9);
      g.add(m);
    }
    const sg = new THREE.BoxGeometry(0.004, 0.004, 0.22);
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(sg, hayMat);
      m.position.set((R0() - 0.5) * 0.4, (R0() - 0.5) * 0.14, (R0() - 0.5) * 0.25);
      m.rotation.set(R0() * 3, R0() * 3, R0() * 3);
      g.add(m);
    }
    g.scale.setScalar(s);
    return g;
  }
  function halfLog(r = 0.07, L = 0.32) {
    const g = new THREE.CylinderGeometry(r, r, L, 10, 1, false, 0, Math.PI);
    const m = new THREE.Mesh(g, [MAT.logs, endMat, endMat]);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, L), splitMat);
    f.rotation.y = Math.PI / 2;
    const grp = new THREE.Group();
    grp.add(m, f);
    return grp;
  }
  function woodBundle() {
    const g = new THREE.Group();
    [
      [-0.07, 0, 0.3],
      [0.07, 0.01, -0.2],
      [0, 0.11, 0.1],
      [-0.08, 0.2, 2.9],
      [0.08, 0.19, 3.3],
    ].forEach(([x, y, a]) => {
      const h = halfLog(0.068, 0.34);
      h.rotation.set(Math.PI / 2, 0, a);
      h.position.set(x, y, 0);
      g.add(h);
    });
    return g;
  }
  // ---- marker over the goal ----
  const MARK = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const q = c.getContext('2d');
    q.translate(64, 64);
    q.rotate(Math.PI / 4);
    q.fillStyle = 'rgba(20,18,15,0.55)';
    q.fillRect(-30, -30, 60, 60);
    q.fillStyle = '#ffd36b';
    q.fillRect(-24, -24, 48, 48);
    q.fillStyle = 'rgba(255,255,255,0.55)';
    q.fillRect(-24, -24, 48, 14);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 })
    );
    s.renderOrder = 999;
    s.visible = false;
    s.userData.noMerge = true;
    scene.add(s);
    return s;
  })();
  // ---------------- things you can carry ----------------
  const PROPS = {};
  function glbThing(id, model, o) {
    const world = new THREE.Group(),
      held = new THREE.Group();
    const T = PLAY.thing(Object.assign({ id, world, held }, o));
    loadModel(model, root => {
      if (!root) return;
      const h = o.size / Math.max(...new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray());
      root.scale.setScalar(h);
      root.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(root),
        c = bb.getCenter(new THREE.Vector3());
      root.position.sub(new THREE.Vector3(c.x, bb.min.y, c.z));
      root.updateMatrixWorld(true);
      if (o.prep) o.prep(root);
      const hc = root.clone(true);
      world.add(o.wrap ? o.wrap(root) : root);
      held.add(hc);
      setTimeout(() => {
        if (T.onPlace) T.onPlace();
      }, 0);
      world.updateMatrixWorld(true);
      markDirty(true);
    });
    return T;
  }
  // the axe: the model stands upright along its y axis; the head is found from the mesh (the wider end) and turned to the top
  const AXE_LEN = { v: 0.72 };
  const AXE = glbThing('axe', 'axe', {
    name: 'Axt',
    carry3: 'tool',
    grip3: {
      at: 0.28,
      get len() {
        return AXE_LEN.v;
      },
    },
    desc: 'Spaltaxt mit 70-cm-Eschenstiel, gut 2 kg. Am Hackklotz Holz spalten.',
    size: 0.72,
    r: 1.3,
    hz: 0.35,
    vm: { x: 0.3, y: -0.2, z: -0.55, rx: -0.25, rz: 0.32 },
    mode: 'stuck',
    onPlace: () => axePose(),
    prep: root => {
      let top = 0,
        bot = 0;
      const bb = new THREE.Box3().setFromObject(root),
        mid = (bb.min.y + bb.max.y) / 2,
        v = new THREE.Vector3();
      root.traverse(m => {
        if (!m.isMesh) return;
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i += 7) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          const w = Math.abs(v.z) + Math.abs(v.x);
          if (v.y > mid) top = Math.max(top, w);
          else bot = Math.max(bot, w);
        }
      });
      if (bot > top) {
        root.rotation.x += Math.PI;
        root.updateMatrixWorld(true);
        const b2 = new THREE.Box3().setFromObject(root);
        root.position.y -= b2.min.y;
        root.updateMatrixWorld(true);
      }
      const b3 = new THREE.Box3().setFromObject(root);
      AXE_LEN.v = b3.max.y - b3.min.y;
      AXE_LEN.t = Math.max(0.02, (b3.max.x - b3.min.x) / 2);
    },
    wrap: root => {
      const pv = new THREE.Group();
      pv.add(root);
      return pv;
    },
  });
  // poses of the axe lying in the world (AXE.world → pivot → model): 'stuck' = head down in the block, handle up and tilted about the head; 'lying' = flat on its side
  function axePose() {
    const pv = AXE.world.children[0];
    if (!pv) return;
    const L = AXE_LEN.v;
    pv.rotation.set(0, 0, 0);
    pv.position.set(0, 0, 0);
    if (AXE.mode === 'stuck') {
      pv.rotation.x = Math.PI;
      pv.position.y = L;
      AXE.world.rotation.set(0.42, AXE.yaw || 0, 0, 'YXZ');
    } else {
      pv.rotation.z = Math.PI / 2;
      pv.position.set(L / 2, AXE_LEN.t || 0.03, 0);
    }
    AXE.world.updateMatrixWorld(true);
    markDirty(true);
  }
  AXE.onTake = () => {
    AXE.mode = 'lying';
    if (Q.fire.st === 'axe') setSt('fire', 'chop');
  };
  const HAYIN = hayBundle(0.9),
    HAYH = new THREE.Group();
  HAYH.add(HAYIN);
  const HAY = PLAY.thing({
    id: 'hay',
    name: 'Heu',
    carry3: 'arms',
    grip3: { fwd: 0.2, dy: -0.06 },
    desc: 'Ein Arm voll Wiesenheu aus Bernds Unterstand – für Lotte, Frieda und Egon.',
    world: hayBundle(1),
    held: HAYH,
    r: 1.4,
    hz: 0.15,
    vm: { x: 0.02, y: -0.36, z: -0.52, rx: 0.25 },
    sfx: () => SFX.hay(),
    onTake: () => {
      if (Q.goat.st === 'hay') {
        setSt('goat', 'feed');
        bark(R(), 'hay', 300);
      }
    },
  });
  const WOOD = PLAY.thing({
    id: 'wood',
    name: 'Brennholz',
    carry3: 'arms',
    grip3: { fwd: 0.18, dy: -0.08 },
    desc: 'Frisch gespaltene Scheite für den Ofen in der Bibliothek.',
    world: woodBundle(),
    held: woodBundle(),
    r: 1.4,
    hz: 0.15,
    vm: { x: 0.06, y: -0.34, z: -0.5, rx: 0.3 },
    sfx: () => SFX.clunk(),
    onTake: () => {
      if (Q.fire.st === 'gather') setSt('fire', 'carry');
    },
  });
  const CAN = glbThing('can', 'jerrycan', {
    name: 'Kanister',
    carry3: 'side',
    grip3: { hang: 0.44 },
    desc: () => (CAN.empty ? 'Leerer 20-Liter-Kanister.' : '20 Liter Diesel für Günters Traktor.'),
    size: 0.47,
    r: 1.3,
    hz: 0.3,
    vm: { x: 0.34, y: -0.5, z: -0.58, ry: 1.35, rz: 0.08 },
    sfx: () => SFX.clunk(),
    takeLabel: () => (CAN.empty ? 'Kanister nehmen (leer)' : 'Dieselkanister nehmen'),
  });
  HAY.gone();
  WOOD.gone();
  // planner items replaced by the carriable ones (the axe lying by the block)
  const hideItems = () => {
    for (const it of window.GLB_PLACED || [])
      if (it.type === 'axe' && it.bld === 'werkstatt' && it.root && it.root.visible) it.root.visible = false;
  };
  // ---- the chopping place: block, a log on it, split halves; the axe stuck in the block ----
  const BLOCK = { lx: -7.4, ly: -36.25, top: 0.48 };
  const blockPos = () => WT(BLOCK.lx, BLOCK.ly);
  function axeInBlock() {
    const [x, y] = blockPos();
    AXE.mode = 'stuck';
    AXE.place(x + 0.03, y - 0.02, BLOCK.top - 0.05, 0.4 + WDA());
  }
  const LOG = (() => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.135, 0.3, 14), [MAT.logs, endMat, endMat]);
    m.position.y = 0.15;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    g.visible = false;
    scene.add(g);
    return g;
  })();
  const HALVES = [];
  for (let i = 0; i < 6; i++) {
    const h = halfLog(0.125, 0.3);
    h.traverse(x => {
      if (x.isMesh) {
        x.castShadow = true;
        x.receiveShadow = true;
      }
    });
    h.visible = false;
    scene.add(h);
    HALVES.push(h);
  }
  function logOnBlock(v) {
    const [x, y] = blockPos();
    LOG.position.copy(V(x, y, BLOCK.top));
    LOG.visible = v;
    markDirty(true);
  }
  function pileSpot(i) {
    const [x, y] = blockPos(),
      a = WDA() + 0.9 + (i % 3) * 0.32,
      r = 0.62 + Math.floor(i / 3) * 0.12;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  }
  function showPile(n) {
    for (let i = 0; i < 6; i++) {
      const h = HALVES[i];
      if (i < n) {
        const [x, y] = pileSpot(i);
        h.position.copy(V(x, y, 0.07));
        h.rotation.set(Math.PI / 2, 0, 0.8 * i, 'XYZ');
        h.visible = true;
      } else h.visible = false;
    }
    markDirty(true);
  }
  // ---- the cabbage bed on Günter's side (Frieda's favourite) ----
  const BED = { x0: -16.3, x1: -12.7, y0: -11.4, y1: -8.6 };
  const CAB = (() => {
    B(BED.x0, BED.x1, BED.y0, BED.y1, 0, 0.07, MAT.soil, { col: false, cast: false });
    const pts = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 5; c++) pts.push([BED.x0 + 0.45 + c * 0.68 + (r % 2) * 0.15, BED.y0 + 0.5 + r * 0.9]);
    const head = new THREE.SphereGeometry(0.15, 12, 9);
    {
      const p = head.attributes.position,
        v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const k = 1 + 0.07 * Math.sin(v.x * 40) * Math.sin(v.z * 37 + v.y * 20);
        p.setXYZ(i, v.x * k, v.y * k * 0.85, v.z * k);
      }
      head.computeVertexNormals();
    }
    const leaf = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42);
    leaf.scale(1, 0.55, 1);
    const hm = plain({ color: 0x9bc27a, roughness: 0.6 }),
      lm = plain({ color: 0x5f8a4c, roughness: 0.75, side: THREE.DoubleSide });
    const IH = new THREE.InstancedMesh(head, hm, pts.length),
      IL = new THREE.InstancedMesh(leaf, lm, pts.length * 2),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler();
    const set = (i, s) => {
      const [x, y] = pts[i];
      m4.compose(V(x, y, 0.13 * s + 0.04), q.setFromEuler(e.set(0, i * 1.3, 0)), new THREE.Vector3(s, s, s));
      IH.setMatrixAt(i, m4);
      for (let k = 0; k < 2; k++) {
        m4.compose(
          V(x, y, 0.05),
          q.setFromEuler(e.set(k ? 0.35 : -0.3, i * 0.7 + k * 1.6, k ? 0.3 : -0.2)),
          new THREE.Vector3(s * (1.05 + k * 0.15), s, s * (1.05 + k * 0.15))
        );
        IL.setMatrixAt(i * 2 + k, m4);
      }
      IH.instanceMatrix.needsUpdate = IL.instanceMatrix.needsUpdate = true;
    };
    pts.forEach((_, i) => set(i, 0.9 + ((i * 37) % 10) / 40));
    for (const im of [IH, IL]) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.userData.noMerge = true;
      scene.add(im);
    }
    const size = pts.map((_, i) => 0.9 + ((i * 37) % 10) / 40);
    return {
      pts,
      eat(i, dt) {
        size[i] = Math.max(0.35, size[i] - dt * 0.03);
        set(i, size[i]);
      },
      reset() {
        pts.forEach((_, i) => {
          size[i] = 0.9 + ((i * 37) % 10) / 40;
          set(i, size[i]);
        });
      },
    };
  })();
  // ---------------- state ----------------
  function setSt(k, st, quiet) {
    const prev = Q[k].st;
    Q[k].st = st;
    track = st === 'done' ? nextOpen() || track : k;
    if (!quiet) {
      if (prev === 'new' && st !== 'done') banner('Neue Aufgabe', TITLES[k]);
      else if (st === 'done') {
        banner('Erledigt', TITLES[k] + REWARD[k]);
        SFX.chime();
        if (allDone()) setTimeout(() => banner('Alle Aufgaben erledigt', 'Willkommen in Ratscher!'), 4200);
      } else SFX.note();
    }
    save();
    renderJournal();
  }
  const REWARD = {
    goat: ' · Bernd schenkt dir Ziegenkäse',
    fire: ' · der Ofen bullert',
    diesel: ' · Günter taut auf',
    board: ' · Samstag wird gegrillt',
  };
  // V15b: the board is made in the workshop game (werk/werk.js) – finished, it goes to Bernd
  function boardMade() {
    if (Q.board.st === 'make') setSt('board', 'deliver');
  }
  const allDone = () => Object.values(Q).every(q => q.st === 'done');
  const nextOpen = () =>
    ['goat', 'fire', 'diesel', 'board'].find(k => Q[k].st !== 'done' && Q[k].st !== 'new') ||
    ['goat', 'fire', 'diesel', 'board'].find(k => Q[k].st !== 'done');
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const things = {};
      for (const [id, T] of Object.entries(PLAY.things))
        if (!T.wp && !T.tool)
          things[id] = {
            state: T.state,
            pos: T.pos,
            yaw: T.yaw,
            empty: T.empty || false,
            mode: T.mode || null,
            slot: PLAY.slotOf(T),
          };
      LS.set({ v: 1, q: Q, track, things, sel: PLAY.inv.sel, stove: STOVE.lit });
    }, 300);
  }
  // objective text and goal position per quest and step
  function objective(k) {
    const q = Q[k],
      st = q.st,
      H_ = T => PLAY.has(T);
    switch (k) {
      case 'goat':
        return {
          new: ['Sprich mit Bernd an der Ziegenweide.', () => [R().x, R().y]],
          hay: ['Hol Heu aus dem Unterstand hinten in der Weide.', () => [30.6, 6.6]],
          feed:
            H_(HAY) || q.fed.length
              ? [
                  'Leg Lotte, Frieda und Egon Heu hin (' + q.fed.length + '/3).',
                  () => {
                    const g = GOATS.filter(g => !q.fed.includes(g.gname)).sort((a, b) => a.dist() - b.dist())[0];
                    return g ? [g.x, g.y] : null;
                  },
                ]
              : ['Hol Heu aus dem Unterstand.', () => [30.6, 6.6]],
          search: ['Frieda ist ausgebüxt! Finde sie – hör auf ihr Meckern.', () => [FRIEDA().x, FRIEDA().y]],
          lead: ['Führe Frieda zurück in Bernds Weide (durch die Gartentür).', () => [PAD.x0 + 2.2, -1.5]],
          report: ['Sag Bernd, dass Frieda wieder da ist.', () => [R().x, R().y]],
          done: ['Erledigt. Bernd hat dir Ziegenkäse geschenkt.', null],
        }[st];
      case 'fire':
        return {
          new: ['Der Ofen in der Bibliothek ist kalt. Schau ihn dir an.', () => G.STV],
          axe: [
            'Hol die Axt vom Hackklotz am Holzplatz (westlich der Werkstatt).',
            () => (AXE.state === 'world' ? AXE.pos : blockPos()),
          ],
          chop: H_(AXE)
            ? ['Spalte drei Scheite am Hackklotz (' + q.chopped + '/3).', () => blockPos()]
            : ['Nimm die Axt, um Holz zu spalten.', () => (AXE.state === 'world' ? AXE.pos : blockPos())],
          gather: ['Sammle das gespaltene Holz auf.', () => pileSpot(2)],
          carry: H_(WOOD)
            ? ['Bring das Holz zum Ofen in der Bibliothek.', () => [G.STV[0], G.STV[1] - 0.6]]
            : ['Nimm das Brennholz wieder auf.', () => WOOD.pos],
          done: ['Erledigt. Der Ofen brennt.', null],
        }[st];
      case 'diesel':
        return {
          new: ['Günter sieht aus, als bräuchte er Hilfe. Sprich mit ihm.', () => [H().x, H().y]],
          fetch: H_(CAN)
            ? ['Bring den Kanister zu Günters Traktor und tank ihn auf.', () => tankPos()]
            : ['Hol den Dieselkanister beim Stromaggregat an der Werkstatt.', () => CAN.pos],
          tell: ['Sag Günter, dass der Traktor voll ist.', () => [H().x, H().y]],
          mount: ['Steig auf den Traktor (links auf den Kotflügel).', () => mountPos()],
          ride: ['Festhalten! Günter fährt eine Runde über den Feldweg.', null],
          done: ['Erledigt. Günter ist jetzt freundlicher.', null],
        }[st];
      case 'board': {
        if (st === 'new') return ['Bernd hat eine Bitte – frag ihn nach deiner Holzwerkstatt.', () => [R().x, R().y]];
        if (st === 'done') return ['Erledigt. Bernd hängt das Brett an die Wand.', null];
        if (window.WERK && LATE.WERK.hasFinished()) return ['Bring das Schneidebrett zu Bernd.', () => [R().x, R().y]];
        if (st === 'deliver')
          return [
            'Nimm ein fertiges Schneidebrett (Regal, obere Ablage) und bring es Bernd.',
            () => LATE.WERK.posOf('shelf'),
          ];
        const o = window.WERK && LATE.WERK.objective();
        return (
          o || ['Bau ein Stirnholz-Schneidebrett in der Werkstatt (Werkstattbuch: B).', () => LATE.WERK.posOf('rack')]
        );
      }
    }
  }
  // ---------------- dialogue: topics that apply right now ----------------
  function topics(who) {
    if (!ON) return [];
    const out = [],
      hasB = !!(window.WERK && LATE.WERK.hasFinished()),
      g = Q.goat.st,
      d = Q.diesel.st,
      b = Q.board.st;
    if (who === 'guenter') {
      if (d === 'new') out.push({ k: 'q_hilfe', label: 'Brauchen Sie Hilfe?' });
      if (d === 'fetch') out.push({ k: 'q_kanister', label: 'Wo ist der Kanister?' });
      if (d === 'tell') out.push({ k: 'q_voll', label: 'Der Traktor ist voll' });
      if (d === 'mount') out.push({ k: 'q_auf', label: 'Kann ich mitfahren?' });
      if (d === 'done' && !Q.diesel.thanked) out.push({ k: 'q_fahrt', label: 'Danke für die Fahrt' });
      if (g === 'search' || g === 'lead') out.push({ k: 'q_frieda', label: 'Haben Sie Frieda gesehen?' });
      if (hasB && !Q.board.shown) out.push({ k: 'q_brett', label: 'Mein Schneidebrett' });
    } else {
      if (g === 'new') out.push({ k: 'q_helfen', label: 'Kann ich dir helfen?' });
      if (g === 'hay' || g === 'feed') out.push({ k: 'q_heu', label: 'Wo ist das Heu?' });
      if (g === 'search' || g === 'lead') out.push({ k: 'q_wo', label: 'Wo ist Frieda?' });
      if (g === 'report') out.push({ k: 'q_frieda', label: 'Frieda ist zurück' });
      if (b === 'new') out.push({ k: 'q_werkstatt', label: 'Meine Holzwerkstatt' });
      if (b === 'make') out.push({ k: 'q_wie', label: 'Wie geht so ein Brett?' });
      if ((b === 'make' || b === 'deliver') && hasB) out.push({ k: 'q_brett', label: 'Dein Schneidebrett' });
    }
    return out;
  }
  function ask(who, k) {
    if (who === 'guenter')
      switch (k) {
        case 'q_hilfe':
          return { after: () => setSt('diesel', 'fetch') };
        case 'q_voll':
          return {
            after: () => {
              setSt('diesel', 'mount');
              guenterToTractor();
            },
            end: true,
          };
        case 'q_auf':
          return { after: () => guenterToTractor(), end: true };
        case 'q_fahrt':
          return {
            after: () => {
              Q.diesel.thanked = true;
              save();
            },
          };
        case 'q_brett':
          return {
            after: () => {
              Q.board.shown = true;
              save();
            },
          };
      }
    else
      switch (k) {
        case 'q_helfen':
          return { after: () => setSt('goat', 'hay') };
        case 'q_frieda':
          return {
            after: () => {
              setSt('goat', 'done');
              const d = DOOR.paddockgate;
              if (d && d.target > 0.5) toggleDoor('paddockgate');
            },
            end: false,
          };
        case 'q_werkstatt':
          return {
            after: () => {
              setSt('board', 'make');
              if (window.WERK && LATE.WERK.finished().some(w => w.where !== 'bernd')) boardMade();
            },
          };
        case 'q_brett':
          return {
            before: () => {
              if (window.WERK) LATE.WERK.handOver();
            },
            after: () => setSt('board', 'done'),
          };
      }
    return null;
  }
  // ---------------- goats: feeding, petting, Frieda's escape, leading her back ----------------
  const tufts = [];
  function tuft(x, y) {
    const t = hayBundle(0.45);
    t.position.copy(V(x, y, 0.05));
    t.traverse(o => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(t);
    tufts.push({ t, life: 14 });
    markDirty(true);
  }
  function eatCtl(g, sec, tx, ty) {
    let t = 0;
    g.ctl = dt => {
      t += dt;
      g.az = lerpAngle(g.az, headingTo(g.x, g.y, tx, ty), Math.min(1, dt * 4));
      g.v = 0;
      g.fig.graze = 1;
      g.fig.anim(dt, 0);
      if (t > sec) {
        g.ctl = null;
        g.target = null;
        g.wait = 1.5;
      }
      return true;
    };
  }
  function petCtl(g, sec) {
    let t = 0;
    g.ctl = dt => {
      t += dt;
      g.az = lerpAngle(g.az, headingTo(g.x, g.y, P.x, P.y), Math.min(1, dt * 4));
      g.v = 0;
      g.fig.graze = 0;
      g.headUp = 1;
      g.fig.anim(dt, 0);
      if (t > sec) {
        g.ctl = null;
        g.target = null;
        g.wait = 2;
      }
      return true;
    };
  }
  const FEEDING = () => ['new', 'hay', 'feed'].includes(Q.goat.st);
  // the hay in the shelter at the back of the paddock: an armful each time
  PLAY.act({
    id: 'goat:haypile',
    r: 1.9,
    prio: 0.5,
    pos: [30.6, 6.95, 0.5],
    label: () =>
      ON && FEEDING() && !PLAY.has(HAY) && HAY.state !== 'world' && Q.goat.fed.length < 3 ? 'Heu nehmen' : null,
    run: () => {
      HAYIN.scale.setScalar(0.9 * (1 - Q.goat.fed.length * 0.25));
      HAY.state = 'gone';
      PLAY.give(HAY);
    },
  });
  for (const name of ['Lotte', 'Frieda', 'Egon']) {
    PLAY.act({
      id: 'goat:feed:' + name,
      r: 1.9,
      prio: 0.6,
      obj: () => goat(name) && goat(name).fig.g,
      need: HAY,
      label: () =>
        ON && PLAY.has(HAY) && FEEDING() && !Q.goat.fed.includes(name) && !goat(name).ctl
          ? name + ' Heu hinlegen'
          : null,
      pos: () => {
        const g = goat(name);
        return [g.x, g.y, 0.5];
      },
      run: () => feed(name),
    });
    PLAY.act({
      id: 'goat:pet:' + name,
      r: 1.5,
      prio: 0.2,
      obj: () => goat(name) && goat(name).fig.g,
      label: () => {
        const g = goat(name);
        if (!g || g.ctl || PLAY.carry === HAY) return null;
        if (name === 'Frieda' && (Q.goat.st === 'search' || Q.goat.st === 'lead')) return null;
        return name + ' streicheln';
      },
      pos: () => {
        const g = goat(name);
        return [g.x, g.y, 0.5];
      },
      run: () => {
        const g = goat(name);
        petCtl(g, 3);
        bleat(g);
        if (near(R(), 12)) setTimeout(() => bark(R(), 'pet', 90), 900);
      },
    });
  }
  function feed(name) {
    const g = goat(name),
      q = Q.goat;
    if (q.st !== 'feed') setSt('goat', 'feed');
    const tx = g.x + (P.x - g.x) * 0.35,
      ty = g.y + (P.y - g.y) * 0.35;
    tuft(tx, ty);
    SFX.hay();
    eatCtl(g, 9, tx, ty);
    q.fed.push(name);
    HAYIN.scale.setScalar(0.9 * (1 - q.fed.length * 0.25));
    if (q.fed.length === 1 && name !== 'Egon' && near(R(), 30)) setTimeout(() => bark(R(), 'egon', 1e9), 1400);
    if (q.fed.length >= 3) {
      PLAY.take(HAY);
      HAY.gone();
      HAYIN.scale.setScalar(0.9);
      setTimeout(escape, 2600);
    }
    save();
    renderJournal();
  }
  // Frieda runs off through the gate (or over it), out of sight she ends up in Günter's cabbage
  function escape() {
    const f = FRIEDA(),
      open = DOOR.paddockgate && DOOR.paddockgate.t > 0.5;
    bark(R(), open ? 'fed_open' : 'fed_jump', 1e9);
    setSt('goat', 'search');
    const path = [
      [PAD.x0 + 0.8, -1.5],
      [PAD.x0 - 2.6, -1.6],
      [PAD.x0 - 3.2, -9],
      [PAD.x0 - 3.0, -16],
    ];
    let i = 0,
      t = 0;
    f.ctl = dt => {
      t += dt;
      const [tx, ty] = path[Math.min(i, path.length - 1)],
        dx = tx - f.x,
        dy = ty - f.y,
        d = Math.hypot(dx, dy);
      if (d < 0.4 && i < path.length - 1) i++;
      f.az = lerpAngle(f.az, Math.atan2(dx, dy), Math.min(1, dt * 5));
      const sp = 2.3,
        mv = Math.min(d, sp * dt);
      f.x += Math.sin(f.az) * mv;
      f.y += Math.cos(f.az) * mv;
      f.v = sp;
      f.fig.graze = 0;
      f.fig.anim(dt, sp);
      const seen = inView(f.x, f.y, 0.6) && f.dist() < 45;
      if ((t > 3 && !seen) || t > 22) {
        lost([-14.6 + Math.random() * 1.4, -10.2 + Math.random() * 1.0]);
      }
      return true;
    };
  }
  function lost(at) {
    const f = FRIEDA();
    if (at) {
      f.x = at[0];
      f.y = at[1];
    }
    let t = 0,
      bt = 2 + Math.random() * 3,
      tgt = null,
      wait = 0;
    const home = [f.x, f.y],
      inBed = f.x > BED.x0 - 0.5 && f.x < BED.x1 + 0.5 && f.y > BED.y0 - 0.5 && f.y < BED.y1 + 0.5;
    f.ctl = dt => {
      t += dt;
      bt -= dt;
      if (bt <= 0) {
        bt = 6 + Math.random() * 5;
        bleat(f);
      }
      if (!tgt && (wait -= dt) <= 0)
        tgt = inBed
          ? [
              BED.x0 + 0.4 + Math.random() * (BED.x1 - BED.x0 - 0.8),
              BED.y0 + 0.4 + Math.random() * (BED.y1 - BED.y0 - 0.8),
            ]
          : [home[0] + (Math.random() - 0.5) * 3, home[1] + (Math.random() - 0.5) * 3];
      if (tgt) {
        const dx = tgt[0] - f.x,
          dy = tgt[1] - f.y,
          d = Math.hypot(dx, dy);
        if (d < 0.25) {
          tgt = null;
          wait = 5 + Math.random() * 8;
        } else {
          f.az = lerpAngle(f.az, Math.atan2(dx, dy), Math.min(1, dt * 3));
          const mv = Math.min(d, 0.45 * dt);
          f.x += Math.sin(f.az) * mv;
          f.y += Math.cos(f.az) * mv;
          f.v = 0.45;
          f.fig.graze = 0;
          f.fig.anim(dt, 0.45);
          return true;
        }
      }
      f.v = 0;
      f.fig.graze = 1;
      f.fig.anim(dt, 0);
      if (inBed) {
        let bi = -1,
          bd = 0.5;
        CAB.pts.forEach((p, i) => {
          const dd = Math.hypot(p[0] - f.x, p[1] - f.y);
          if (dd < bd) {
            bd = dd;
            bi = i;
          }
        });
        if (bi >= 0) CAB.eat(bi, dt);
      }
      if (inBed && near(f, 13) && Math.hypot(H().x - f.x, H().y - f.y) < 28 && !H().drive) bark(H(), 'frieda', 1e9);
      return true;
    };
  }
  const trail = [];
  let trailLast = null;
  PLAY.act({
    id: 'goat:lead',
    r: 1.7,
    prio: 0.8,
    obj: () => FRIEDA() && FRIEDA().fig.g,
    label: () => (ON && Q.goat.st === 'search' && FRIEDA().ctl ? 'Frieda am Halsband nehmen' : null),
    pos: () => {
      const f = FRIEDA();
      return [f.x, f.y, 0.5];
    },
    run: () => lead(),
  });
  function lead() {
    const f = FRIEDA();
    setSt('goat', 'lead');
    trail.length = 0;
    trailLast = [P.x, P.y];
    bleat(f);
    PLAY.think('Komm, Frieda. Nach Hause.', 2500);
    f.ctl = dt => {
      if (trailLast && Math.hypot(P.x - trailLast[0], P.y - trailLast[1]) > 0.25) {
        trail.push([P.x, P.y]);
        trailLast = [P.x, P.y];
        if (trail.length > 200) trail.shift();
      }
      const dp = Math.hypot(P.x - f.x, P.y - f.y);
      if (dp > 12 || P.mode !== 'walk') {
        PLAY.think('Frieda ist stehen geblieben.');
        Q.goat.st = 'search';
        lost();
        renderJournal();
        return true;
      }
      let tgt = null,
        acc = 0;
      for (let i = trail.length - 1; i > 0; i--) {
        acc += Math.hypot(trail[i][0] - trail[i - 1][0], trail[i][1] - trail[i - 1][1]);
        if (acc > 1.25) {
          tgt = trail[i - 1];
          break;
        }
      }
      if (!tgt) {
        if (dp > 1.6) tgt = [P.x, P.y];
      }
      if (tgt && dp > 1.0) {
        const dx = tgt[0] - f.x,
          dy = tgt[1] - f.y,
          d = Math.hypot(dx, dy),
          sp = Math.min(2.6, Math.max(0.6, (dp - 1.0) * 1.6));
        if (d > 0.08) {
          f.az = lerpAngle(f.az, Math.atan2(dx, dy), Math.min(1, dt * 6));
          const mv = Math.min(d, sp * dt);
          f.x += Math.sin(f.az) * mv;
          f.y += Math.cos(f.az) * mv;
        }
        f.v = sp;
        f.fig.graze = 0;
        f.fig.anim(dt, sp);
      } else {
        f.v = 0;
        f.az = lerpAngle(f.az, headingTo(f.x, f.y, P.x, P.y), Math.min(1, dt * 3));
        f.fig.graze = 0;
        f.fig.anim(dt, 0);
      }
      if (f.x > PAD.x0 + 0.9 && f.x < PAD.x1 - 0.5 && f.y > PAD.y0 + 0.5 && f.y < PAD.y1 - 0.5) {
        f.ctl = null;
        f.target = null;
        f.wait = 2;
        setSt('goat', 'report');
        bark(R(), 'back', 1e9);
        bleat(f);
      }
      return true;
    };
  }
  // ---------------- fire ----------------
  const stoveFront = () => [G.STV[0], G.STV[1] - 0.62, G.zF + 0.5];
  PLAY.act({
    id: 'fire:stove',
    r: 1.5,
    prio: 0.5,
    obj: () => window.stoveGlow,
    pos: stoveFront,
    need: () => (PLAY.has(WOOD) ? WOOD : null),
    label: () => {
      if (!ON || PHASE < PHN.stove || STOVE.lit || P.feet > G.zE) return null;
      if (PLAY.has(WOOD)) return 'Holz einlegen und anzünden';
      return 'Ofen ansehen';
    },
    hold: () => (PLAY.has(WOOD) ? 3.4 : 0),
    holdLabel: 'Feuer machen …',
    anim3: 'kneel',
    start: () => {
      SFX.clunk();
    },
    work: k => {
      if (k > 0.55 && !fireSnd.m) {
        fireSnd.m = 1;
        SFX.match();
      }
      if (k > 0.8 && !fireSnd.w) {
        fireSnd.w = 1;
        SFX.whoomp();
      }
    },
    cancel: () => {
      fireSnd.m = fireSnd.w = 0;
    },
    run: () => {
      fireSnd.m = fireSnd.w = 0;
      if (PLAY.has(WOOD)) {
        PLAY.take(WOOD);
        WOOD.gone();
        STOVE.light();
        setSt('fire', 'done');
        setTimeout(() => PLAY.think('So. Jetzt wird es gemütlich.'), 1200);
        return;
      }
      const st = Q.fire.st;
      if (st === 'new') {
        PLAY.think(
          'Der Ofen ist kalt. Für ein Feuer brauche ich gespaltenes Holz – am Holzplatz westlich der Werkstatt liegen Stämme, die Axt steckt im Hackklotz.',
          6500
        );
        setSt('fire', PLAY.has(AXE) ? 'chop' : 'axe');
      } else PLAY.think(objective('fire')[0]);
    },
  });
  const fireSnd = { m: 0, w: 0 };
  let chopping = false;
  PLAY.act({
    id: 'fire:chop',
    r: 1.5,
    prio: 0.6,
    obj: () => LOG,
    pos: () => {
      const [x, y] = blockPos();
      return [x, y, BLOCK.top];
    },
    need: AXE,
    gest3: false,
    label: () =>
      ON && PLAY.has(AXE) && (Q.fire.st === 'chop' || Q.fire.st === 'axe') && Q.fire.chopped < 3 && !chopping
        ? 'Holz spalten (' + Q.fire.chopped + '/3)'
        : null,
    run: async () => {
      if (chopping) return;
      chopping = true;
      if (Q.fire.st === 'axe') Q.fire.st = 'chop';
      logOnBlock(true);
      SFX.swing();
      await HELD.play(
        0.5,
        k =>
          k < 0.62
            ? { rx: -1.1 * (k / 0.62), dy: 0.14 * (k / 0.62), dz: 0.05 * (k / 0.62) }
            : { rx: -1.1 + 2.3 * Math.min(1, (k - 0.62) / 0.16), dy: 0.14 - 0.3 * Math.min(1, (k - 0.62) / 0.16) },
        'chop'
      );
      SFX.chop();
      const n = Q.fire.chopped;
      LOG.visible = false;
      splitFly(n);
      Q.fire.chopped = n + 1;
      markDirty(true);
      await HELD.play(0.45, k => ({ rx: 1.2 * (1 - k), dy: -0.16 * (1 - k) }), 'chopback');
      if (Q.fire.chopped >= 3) {
        setSt('fire', 'gather');
      } else {
        setTimeout(() => logOnBlock(true), 350);
        save();
        renderJournal();
      }
      chopping = false;
    },
  });
  function splitFly(n) {
    const [bx, by] = blockPos();
    const a = HALVES[n * 2],
      b = HALVES[n * 2 + 1];
    let t = 0;
    const s0 = V(bx, by, BLOCK.top + 0.15);
    const tg = [pileSpot(n * 2), pileSpot(n * 2 + 1)];
    for (const h of [a, b]) {
      h.visible = true;
      h.position.copy(s0);
    }
    const step = dt => {
      t += dt;
      const k = Math.min(1, t / 0.45);
      [a, b].forEach((h, j) => {
        const e = V(tg[j][0], tg[j][1], 0.07);
        h.position.lerpVectors(s0, e, k);
        h.position.y += Math.sin(k * Math.PI) * 0.35;
        h.rotation.set((Math.PI / 2) * k + (j ? 0.2 : -0.2), 0, 0.8 * (n * 2 + j) * k, 'XYZ');
      });
      markDirty();
      return k < 1;
    };
    const fn = dt => {
      if (!step(dt)) {
        const i = window.TICKS.indexOf(fn);
        if (i >= 0) window.TICKS.splice(i, 1);
      }
    };
    window.TICKS.push(fn);
  }
  PLAY.act({
    id: 'fire:gather',
    r: 1.5,
    prio: 0.6,
    obj: () => HALVES[0],
    pos: () => {
      const [x, y] = pileSpot(2);
      return [x, y, 0.1];
    },
    label: () =>
      ON && Q.fire.st === 'gather' && WOOD.state !== 'world' && !PLAY.has(WOOD) ? 'Brennholz aufsammeln' : null,
    run: () => {
      showPile(0);
      WOOD.state = 'gone';
      PLAY.give(WOOD);
    },
  });
  // ---------------- Günter's diesel and the ride along ----------------
  const tr = () => TRACTOR.g,
    home = () => !H().drive && Math.hypot(tr().position.x - TRACTOR_HOME.x, -tr().position.z - TRACTOR_HOME.y) < 0.6;
  const trLocal = (lx, ly) => {
    const az = -tr().rotation.y,
      x = tr().position.x,
      y = -tr().position.z;
    return [x + Math.sin(az) * ly + Math.cos(az) * lx, y + Math.cos(az) * ly - Math.sin(az) * lx];
  }; // lx: to the right, ly: forwards
  const tankPos = () => {
      const [x, y] = trLocal(0, 0.55);
      return [x, y];
    },
    mountPos = () => trLocal(-1.0, -0.45);
  PLAY.act({
    id: 'diesel:fill',
    r: 1.9,
    prio: 0.7,
    obj: () => tr(),
    pos: () => [...tankPos(), 1.2],
    need: CAN,
    label: () => (ON && PLAY.has(CAN) && !CAN.empty && Q.diesel.st === 'fetch' && home() ? 'Traktor tanken' : null),
    hold: 4.4,
    holdLabel: 'Tanken …',
    anim3: 'pour',
    start: () => {
      SFX.glug(4.2);
      if (near(H(), 9)) bark(H(), 'fill', 120);
    },
    work: k => {
      HELD.anim = {
        t: 0,
        dur: 1,
        f: () => ({ rz: -1.0 * Math.min(1, k * 4), dy: 0.22 * Math.min(1, k * 4), dx: -0.12 * Math.min(1, k * 4) }),
        res: () => {},
        kind: 'pour',
      };
    },
    cancel: () => {
      HELD.anim = null;
    },
    run: () => {
      HELD.anim = null;
      CAN.empty = true;
      const [x, y] = trLocal(-1.3, 0.9);
      PLAY.take(CAN);
      CAN.place(x, y, 0, -tr().rotation.y);
      setSt('diesel', 'tell');
      PLAY.think('Voll. Jetzt Günter Bescheid sagen.', 2600);
    },
  });
  PLAY.act({
    id: 'diesel:mount',
    r: 2.3,
    prio: 0.8,
    obj: () => tr(),
    pos: () => [...mountPos(), 1.0],
    label: () => (ON && Q.diesel.st === 'mount' && home() && !PLAY.seat ? 'Auf den Traktor steigen' : null),
    run: () => mount(),
  });
  function guenterToTractor() {
    const h = H();
    h.tractorT = 1e9;
    const [tx, ty] = trLocal(1.0, -0.9);
    h.ctl = dt => {
      if (h.talking || h.drive) return false;
      const dx = tx - h.x,
        dy = ty - h.y,
        d = Math.hypot(dx, dy);
      if (d > 0.3) {
        h.az = lerpAngle(h.az, Math.atan2(dx, dy), Math.min(1, dt * 3));
        const sp = 1.0,
          mv = Math.min(d, sp * dt);
        h.x += Math.sin(h.az) * mv;
        h.y += Math.cos(h.az) * mv;
        h.v = sp;
        h.fig.anim(dt, sp);
      } else {
        h.v = 0;
        h.az = lerpAngle(h.az, headingTo(h.x, h.y, tr().position.x, -tr().position.z), Math.min(1, dt * 2));
        h.fig.anim(dt, 0);
        if (Q.diesel.st === 'ride' && PLAY.seat && PLAY.seat.kind === 'ride' && !h.drive) {
          h.ctl = null;
          startDrive(h);
          h.drive.passenger = true;
          bark(h, 'ride_1', 0);
        }
      }
      return true;
    };
  }
  let rideYaw = null;
  function mount() {
    setSt('diesel', 'ride', true);
    renderJournal();
    if (!H().ctl && !H().drive) guenterToTractor();
    const seatF = () => {
      const [x, y] = trLocal(-0.62, -0.42);
      return { x, y, z: 2.05 };
    };
    rideYaw = -tr().rotation.y;
    PLAY.sit({
      kind: 'ride',
      lock: true,
      lockMsg: 'Während der Fahrt wird nicht abgesprungen.',
      follow: () => {
        const az = -tr().rotation.y;
        if (rideYaw != null) {
          let d = az - rideYaw;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          P.yaw += (d * 180) / Math.PI;
        }
        rideYaw = az;
        return seatF();
      },
      yaw: (-tr().rotation.y * 180) / Math.PI,
      pitch: -4,
      back: [...mountPos(), 0],
      onSit: () => SFX.clunk(),
    });
  }
  const RIDE_LINES = { 3: 'ride_2', 5: 'ride_4', 7: 'ride_3' };
  function driveWp(i) {
    const h = H();
    if (!(h.drive && h.drive.passenger)) return;
    const id = RIDE_LINES[i];
    if (id) bark(h, id, 0);
  }
  function driveEnd(w) {
    if (Q.diesel.st !== 'ride') return;
    const [x, y] = mountPos();
    if (PLAY.seat) {
      PLAY.seat.back = [x, y, 0];
      PLAY.stand(true);
    }
    rideYaw = null;
    bark(w, 'ride_end', 0);
    w.tractorT = 300 + Math.random() * 200;
    w.avoidUntil = 0;
    setTimeout(() => setSt('diesel', 'done'), 2400);
  }
  // ---------------- journal, tracker, banner ----------------
  const jr = (() => {
    const el = document.createElement('aside');
    el.id = 'quests';
    el.hidden = true;
    el.setAttribute('aria-label', 'Aufgaben');
    ($('p-3d') || document.body).appendChild(el);
    return el;
  })();
  const tk = $('qtrack'),
    bn = (() => {
      const el = document.createElement('div');
      el.id = 'qbanner';
      el.hidden = true;
      ($('p-3d') || document.body).appendChild(el);
      return el;
    })();
  let bnT = null;
  function banner(a, b) {
    bn.innerHTML = '<small></small><b></b>';
    bn.querySelector('small').textContent = a;
    bn.querySelector('b').textContent = b;
    bn.hidden = false;
    bn.classList.remove('go');
    void bn.offsetWidth;
    bn.classList.add('go');
    clearTimeout(bnT);
    bnT = setTimeout(() => {
      bn.hidden = true;
    }, 4200);
  }
  const STATUS = st => (st === 'done' ? 'erledigt' : st === 'new' ? 'offen' : 'läuft');
  function renderJournal() {
    if (jr.hidden) {
      updateBtn();
      return;
    }
    const keys = ['goat', 'fire', 'diesel', 'board'];
    jr.innerHTML =
      '<h3>Aufgaben<button type="button" class="x" aria-label="Schließen">×</button></h3>' +
      keys
        .map(k => {
          const o = objective(k) || ['', null],
            st = Q[k].st;
          return `<div class="qi${track === k ? ' tr' : ''}${st === 'done' ? ' dn' : ''}" data-q="${k}"><div class="qh"><b>${TITLES[k]}</b><span class="qs ${st === 'done' ? 'ok' : st === 'new' ? '' : 'run'}">${STATUS(st)}</span></div><div class="qw">${WHO[k]}</div><p>${o[0]}</p>${st !== 'done' ? `<button type="button" class="qt" data-track="${k}" aria-pressed="${track === k}">${track === k ? 'Wird verfolgt' : 'Verfolgen'}</button>` : ''}</div>`;
        })
        .join('') +
      '<div class="qf"><span>E / Knopf: handeln · Q: ablegen, aufstehen · J: Aufgaben</span><button type="button" id="qreset">Neu beginnen</button></div>';
    jr.querySelector('.x').addEventListener('click', () => toggleJournal(false));
    jr.querySelectorAll('[data-track]').forEach(b =>
      b.addEventListener('click', () => {
        track = b.dataset.track;
        save();
        renderJournal();
      })
    );
    const rs = $('qreset');
    rs.addEventListener('click', () => {
      if (rs.dataset.sure) {
        reset();
        return;
      }
      rs.dataset.sure = '1';
      rs.textContent = 'Wirklich alles zurücksetzen?';
      setTimeout(() => {
        if (rs.isConnected) {
          delete rs.dataset.sure;
          rs.textContent = 'Neu beginnen';
        }
      }, 4000);
    });
    updateBtn();
  }
  function updateBtn() {
    const b = $('questbtn');
    if (!b) return;
    const n = Object.values(Q).filter(q => q.st !== 'done').length;
    b.querySelector('span').textContent = n ? n + ' offen' : 'alle erledigt';
    b.setAttribute('aria-pressed', jr.hidden ? 'false' : 'true');
  }
  function toggleJournal(v) {
    jr.hidden = !(v ?? jr.hidden);
    renderJournal();
  }
  $('questbtn')?.addEventListener('click', () => toggleJournal());
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || (window.PIANO && PIANO.on)) return;
    if (e.key === 'j' || e.key === 'J') {
      toggleJournal();
      e.preventDefault();
    }
  });
  let tkLast = '',
    mkAcc = 0;
  function updateTracker(dt) {
    if (!ON || !tk) return;
    const show = P.mode === 'walk' && !(typeof PLAN !== 'undefined' && PLAN.on);
    const k = track,
      o = Q[k] && objective(k);
    let txt = '',
      arrow = null,
      dist = null,
      tp = null;
    if (show && o && Q[k].st !== 'done') {
      txt = o[0];
      try {
        tp = o[1] ? o[1]() : null;
      } catch (e) {
        tp = null;
      }
      if (tp) {
        dist = Math.hypot(tp[0] - P.x, tp[1] - P.y);
        arrow = (Math.atan2(tp[0] - P.x, tp[1] - P.y) * 180) / Math.PI - P.yaw;
      }
    }
    const key = txt + '|' + (dist != null ? Math.round(dist) : '') + '|' + (arrow != null ? Math.round(arrow / 8) : '');
    if (key !== tkLast) {
      tkLast = key;
      tk.hidden = !txt;
      if (txt) {
        tk.innerHTML =
          `<b>${TITLES[k]}</b><span>${txt}</span>` +
          (dist != null && dist > 2.5
            ? `<i style="transform:rotate(${arrow.toFixed(0)}deg)">↑</i><em>${Math.round(dist)} m</em>`
            : '');
      }
    }
    // marker over the goal
    if (tp && dist > 3.5 && show) {
      const z =
        (k === 'fire' && (Q.fire.st === 'carry' || Q.fire.st === 'new') ? G.zF : 0) +
        2.1 +
        Math.sin(performance.now() / 400) * 0.06;
      MARK.position.copy(V(tp[0], tp[1], z));
      const s = THREE.MathUtils.clamp(dist * 0.03, 0.22, 1.1);
      MARK.scale.set(s, s, 1);
      if (!MARK.visible) {
        MARK.visible = true;
        markDirty();
      }
      mkAcc += dt;
      if (mkAcc > 0.25) {
        mkAcc = 0;
        markDirty();
      }
    } else if (MARK.visible) {
      MARK.visible = false;
      markDirty();
    }
  }
  tk?.addEventListener('click', () => toggleJournal(true));
  // ---------------- per frame ----------------
  let hintShown = false;
  window.TICKS.push(dt => {
    if (!ON) return;
    hideItems();
    for (let i = tufts.length - 1; i >= 0; i--) {
      const t = tufts[i];
      t.life -= dt;
      if (t.life < 3) {
        t.t.scale.setScalar(Math.max(0.01, (0.45 * t.life) / 3));
        markDirty();
      }
      if (t.life <= 0) {
        scene.remove(t.t);
        tufts.splice(i, 1);
      }
    }
    const h = H();
    if (['fetch', 'tell', 'mount', 'ride'].includes(Q.diesel.st) && !h.drive) h.tractorT = Math.max(h.tractorT, 1e8);
    updateTracker(dt);
    if (!hintShown && P.mode === 'walk' && LOAD.ready) {
      hintShown = true;
      const seen = !SAVE.once('pav-v14'); // one-time hint /* (V15: the menu's word about the new controls replaces this one) */
    }
  });
  // ---------------- load / reset ----------------
  function placeDefaults() {
    axeInBlock();
    const [x, y] = WT(3.78, -37.95);
    CAN.empty = false;
    CAN.place(x, y, 0, 0.3 + WDA());
    HAY.gone();
    WOOD.gone();
    logOnBlock(false);
    showPile(0);
  }
  function load() {
    const s = LS.get();
    placeDefaults();
    if (!s || s.v !== 1) {
      renderJournal();
      return;
    }
    for (const k of Object.keys(Q)) if (s.q && s.q[k]) Object.assign(Q[k], s.q[k]);
    track = s.track || track;
    // steps that cannot survive a reload fall back to the last safe one
    if (Q.goat.st === 'lead') Q.goat.st = 'search';
    if (Q.diesel.st === 'ride') Q.diesel.st = 'mount';
    if (Q.fire.st === 'chop' && Q.fire.chopped >= 3) Q.fire.st = 'gather';
    if (Q.board.stage !== undefined) {
      if (['saw', 'plane', 'glue', 'endgrain', 'sand', 'oil', 'deliver'].includes(Q.board.st)) Q.board.st = 'make';
      delete Q.board.stage;
    } // (V14 steps: the board is now made in the workshop game)
    const inv = [];
    for (const [id, t] of Object.entries(s.things || {})) {
      const T = PLAY.things[id];
      if (!T || T.wp || T.tool) continue;
      if (t.empty) T.empty = true;
      if (t.mode) T.mode = t.mode;
      if (t.state === 'world' && t.pos) {
        if (T === AXE && t.mode === 'stuck') axeInBlock();
        else T.place(t.pos[0], t.pos[1], t.pos[2], t.yaw || 0);
      } else if (t.state === 'gone') T.gone();
      else if (t.state === 'hand' || t.state === 'inv') {
        inv.push([T, t.slot]);
        T.gone();
      }
    }
    if (inv.length)
      setTimeout(() => {
        for (const [T, sl] of inv) PLAY.give(T, sl);
        PLAY.select(s.sel ?? inv[0][1] ?? 0, true);
      }, 50);
    if (Q.fire.st === 'gather') showPile(6);
    else if (Q.fire.st === 'chop') showPile(Q.fire.chopped * 2);
    if (Q.goat.st === 'search') lost([-14.6, -9.8]);
    if (Q.goat.st === 'done') {
      const d = DOOR.paddockgate;
      if (d) {
        d.t = d.target = 0;
        poseDoor(d);
      }
    }
    if (Q.diesel.st === 'mount') guenterToTractor();
    if (s.stove || Q.fire.st === 'done') STOVE.light(true);
    renderJournal();
  }
  function reset() {
    LS.del();
    for (const k of Object.keys(Q)) {
      for (const f of Object.keys(Q[k])) delete Q[k][f];
    }
    Object.assign(Q.goat, { st: 'new', fed: [] });
    Object.assign(Q.fire, { st: 'new', chopped: 0 });
    Object.assign(Q.diesel, { st: 'new', empty: false, thanked: false });
    Object.assign(Q.board, { st: 'new', shown: false });
    if (PLAY.seated()) PLAY.stand(true);
    PLAY.clearInv();
    HAYIN.scale.setScalar(0.9);
    for (const g of GOATS) {
      g.ctl = null;
    }
    FRIEDA().x = 30;
    FRIEDA().y = 1;
    H().ctl = null;
    H().tractorT = 120;
    CAB.reset();
    STOVE.put();
    if (window.WERK) LATE.WERK.reset();
    if (window.GEAR) LATE.GEAR.reset();
    const d = DOOR.paddockgate;
    if (d) {
      d.t = d.target = 1;
      poseDoor(d);
    }
    track = 'goat';
    placeDefaults();
    save();
    renderJournal();
    toast('Alle Aufgaben zurückgesetzt.');
  }
  if (ON) whenLoaded(() => setTimeout(load, 300));
  return {
    topics,
    ask,
    event(n) {
      if (n === 'guenterbench' && near(H(), 16)) bark(H(), 'bench', 120);
    },
    friendly: who => (who === 'guenter' ? Q.diesel.st === 'done' : Q.goat.st === 'done' || Q.board.st === 'done'),
    driveWp,
    driveEnd,
    objective,
    Q,
    things: { AXE, HAY, WOOD, CAN },
    reset,
    toggleJournal,
    get track() {
      return track;
    },
    set track(k) {
      track = k;
      renderJournal();
    },
    boardMade,
    banner,
    lost,
    escape,
    CAB,
    on: ON,
  };
})();
LATE.QUESTS = QUESTS;
window.QUESTS = QUESTS;
