// ===================== feat/zombie: allies of the zombie night – Hubert and Ronald, survivors, the clan (ZBUND) =====================
// Falko, 4.11.2026: „… und gegebenenfalls auch mit anderen Überlebenden verbündete Clans bilden, mit denen man dann zusammen die Zombies
// fertig machen kann.“ Hubert and Ronald are real neighbours – they never turn; asked for help they come along (Hubert with his axe,
// Ronald wants something to eat first), walk behind the player or guard a place, and fight the zombies near them. Their own figures and
// walkers stay theirs (npc/npc.js): the walker's controller (w.ctl) steers them while they are allies, npc/hours.js keeps them out at night
// (w.keep). Struck down they are only hurt: they sit until the morning. Survivors (people of the streets, not turned) hide in houses by day
// (zombie/z_haus.js): talk to them, give them something to eat, and they join; struck down they die – and rise again as zombies. The first
// ally founds the clan: it gets a name. The zombies attack allies that are nearer than the player (ZHORDE.pick).
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { collide, floorAt, P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { NPCS, NPCUI } from '../npc/npc.js';
import { ZDATA } from './z_data.js';
import { Z } from './z_state.js';
import { ZTON } from './z_ton.js';
import { ZFX } from './z_fx.js';
import { ZFIG } from './z_fig.js';
import { ZHORDE } from './z_horde.js';
import { ZHAUS } from './z_haus.js';
export const ZBUND = (() => {
  const S = { list: [], props: {} };
  const hyp = Math.hypot,
    rnd = Math.random;
  const isAlly = w => S.list.some(a => a.npc === w);
  // ---- a tool in the hands of a neighbour: npc/life.js holdProp puts a prop of kind 'axe' between the hands, the handle along the forearms ----
  let PM = null;
  function prop(kind) {
    if (S.props[kind]) return S.props[kind];
    PM = PM || {
      wood: plain({ color: 0x8a6a45, roughness: 0.75 }),
      steel: plain({ color: 0x80878b, roughness: 0.35, metalness: 0.8 }),
    };
    const g = new THREE.Group(),
      h = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.85, 8), PM.wood);
    h.position.y = 0.05;
    g.add(h);
    const head =
      kind === 'spaten'
        ? new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.26, 0.01), PM.steel)
        : new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.03), PM.steel);
    head.position.set(kind === 'spaten' ? 0 : 0.05, kind === 'spaten' ? 0.56 : 0.44, 0);
    g.add(head);
    g.userData.kind = 'axe';
    g.userData.noMerge = true;
    g.traverse(o => (o.castShadow = true));
    g.visible = false;
    scene.add(g);
    return (S.props[kind] = g);
  }
  // ---- what neighbours say (as subtitles) ----
  const SAY = {
    hubert: {
      join: [
        'Na endlich fragt mal einer. Ich hol meine Axt.',
        'Die Sirene … das hab ich zuletzt 1990 gehört. Ich komm mit.',
      ],
      wait: ['Gut, ich halt hier die Stellung.', 'Ich bleib hier. Ruf, wenn was ist.'],
      follow: ['Ich bin hinter dir.', 'Los, weiter.'],
      down: ['Mich hat’s erwischt … ich muss mich setzen.'],
      fight: ['Komm her, du!', 'Weg da!', 'Das war mal der Gerhard …'],
    },
    ronald: {
      ask: ['Hast du was zu essen dabei? Seit gestern nichts im Magen. Dann komm ich mit.'],
      join: ['Danke. Ich nehm den Spaten.', 'Gut, zu zweit ist besser als allein.'],
      wait: ['Ich pass hier auf.'],
      follow: ['Ich komme.'],
      down: ['Ah … mein Bein. Ich bleib hier sitzen.'],
      fight: ['Pass auf, hinter dir!', 'Hau ab!'],
    },
  };
  const line = (who, k) => {
    const L = (SAY[who] || SAY.hubert)[k] || [];
    return L[Math.floor(rnd() * L.length)] || '';
  };
  function say(a, k) {
    const t = line(a.who, k);
    if (!t) return;
    if (a.npc) NPCUI.sub(a.npc, t);
    else PLAY.think(a.name + ': „' + t + '“', 2600);
  }
  // ---- joining ----
  function join(a) {
    S.list.push(a);
    if (!Z.clan.members.includes(a.who)) Z.clan.members.push(a.who);
    Z.save();
    Z.emit('ally', { who: a.who });
    if (!Z.clan.name && S.askName) S.askName();
  }
  function joinNpc(w, who, quiet) {
    if (isAlly(w)) return;
    const a = {
      kind: 'ally',
      who,
      name: who === 'hubert' ? 'Hubert' : 'Ronald',
      npc: w,
      hp: who === 'hubert' ? 130 : 100,
      hp0: who === 'hubert' ? 130 : 100,
      mode: 'folgen',
      gx: w.x,
      gy: w.y,
      cd: 0,
      t: 0,
      down: false,
      strike: false,
    };
    w.keep = () => Z.on && isAlly(w);
    w.prop = prop(who === 'hubert' ? 'axt' : 'spaten');
    w.prop.visible = true;
    w.ctl = dt => ctl(a, dt);
    join(a);
    if (!quiet) say(a, 'join');
  }
  // ---- a survivor found in a house (zombie/z_haus.js) ----
  async function survivor(key, x, y, z, hd) {
    const w = ZFIG.byKey[key];
    if (!w) return null;
    const a = {
      kind: 'ally',
      who: key,
      name: w.name,
      F: null,
      x,
      y,
      z,
      hd,
      hp: 80,
      hp0: 80,
      mode: 'versteckt',
      gx: x,
      gy: y,
      cd: 0,
      t: 0,
      down: false,
      found: true,
    };
    S.hidden = S.hidden || [];
    S.hidden.push(a);
    try {
      a.F = await ZFIG.make(key, { alive: true });
      a.F.mode = 'eat'; // crouched in a corner
      ZFIG.place(a.F, x, y, z, hd);
      markDirty();
    } catch (e) {
      console.warn('survivor', key, e);
    }
    KERN.act({
      id: 'zbund:s:' + key,
      r: 2.2,
      prio: 0.2,
      pos: () => [a.x, a.y, a.z + 1.1],
      label: () => (Z.on && a.mode === 'versteckt' && !a.dead ? 'Mit ' + a.name + ' sprechen' : null),
      run: () => {
        const food = ['konserve', 'glas', 'brot'].find(k => Z.has(k));
        if (!food) {
          PLAY.think(
            a.name + ': „Bist du gebissen? … Nein? Hast du was zu essen? Ich hab seit zwei Tagen nichts gehabt.“',
            4200
          );
          return;
        }
        Z.use(food);
        a.mode = 'folgen';
        S.hidden = S.hidden.filter(q => q !== a);
        KERN.unact('zbund:s:' + key);
        PLAY.think(a.name + ': „Danke. Ich komm mit – allein hier drin werd ich verrückt.“', 3500);
        join(a);
      },
    });
    return a;
  }
  // a house by day: somebody alive hiding in a room away from the door
  ZHAUS.onEnter.push(H => {
    const rooms = (H.rooms || []).filter(r => r.poly && r.poly.length >= 3 && r.kind !== 'flur');
    const used = new Set(Z.clan.members),
      keys = ZFIG.people().filter(k => ZFIG.byKey[k].src === 'vk' && !used.has(k));
    if (!rooms.length || !keys.length) return;
    const r = rooms[Math.floor(rnd() * rooms.length)],
      cx = r.poly.reduce((s, q) => s + q[0], 0) / r.poly.length,
      cy = r.poly.reduce((s, q) => s + q[1], 0) / r.poly.length;
    survivor(keys[Math.floor(rnd() * keys.length)], cx, cy, r.z0 ?? floorAt(cx, cy, P.feet + 0.5), rnd() * 360);
  });
  // ---- the zombies' choice: an ally nearer than the player ----
  ZHORDE.pick = (e, me) => {
    let best = null,
      bd = Math.min(12, hyp(me.x - e.x, me.y - e.y) - 1.5);
    for (const a of S.list) {
      if (a.down || a.dead || a.mode === 'versteckt') continue;
      const x = a.npc ? a.npc.x : a.x,
        y = a.npc ? a.npc.y : a.y,
        d = hyp(x - e.x, y - e.y);
      if (d < bd) {
        bd = d;
        best = { x, y, z: a.npc ? floorAt(x, y, P.feet + 1) : a.z, car: null, ally: a };
      }
    }
    return best;
  };
  ZHORDE.hitAlly = (a, dmg) => {
    if (a.down || a.dead) return;
    a.hp -= dmg;
    const x = a.npc ? a.npc.x : a.x,
      y = a.npc ? a.npc.y : a.y;
    ZFX.spray(x, y, (a.npc ? floorAt(x, y, P.feet + 1) : a.z) + 1.2, rnd() - 0.5, rnd() - 0.5, 8, 1.4, 1);
    ZTON.hit(x, y, 'blunt');
    if (a.hp > 0) return;
    if (a.npc) {
      a.down = true;
      a.npc.fig.mode = 'sit';
      a.npc.fig.pose = null;
      say(a, 'down');
    } else {
      a.dead = true;
      a.deadT = 0;
      if (a.F) a.F.mode = 'dead';
      ZTON.die(x, y);
      PLAY.think(a.name + ' ist tot.', 2500);
      Z.clan.members = Z.clan.members.filter(k => k !== a.who);
      Z.save();
    }
  };
  // ---- steering an ally: the next zombie near (and not too far from the player), else behind the player, or the guard place ----
  function foe(x, y) {
    let best = null,
      bd = 9;
    for (const e of Z.ents) {
      if (e.kind !== 'zombie' || e.dead || e.fly || e.st === 'turn') continue;
      const d = hyp(e.x - x, e.y - y);
      if (d < bd && hyp(e.x - P.x, e.y - P.y) < 22) {
        bd = d;
        best = e;
      }
    }
    return best;
  }
  function moveTo(a, pos, tx, ty, v, dt) {
    const dx = tx - pos.x,
      dy = ty - pos.y,
      d = hyp(dx, dy);
    if (d < 0.05 || v <= 0) return 0;
    const st = Math.min(d, v * dt),
      p = [pos.x + (dx / d) * st, pos.y + (dy / d) * st];
    collide(p, pos.z || 0, true);
    pos.x = p[0];
    pos.y = p[1];
    return hyp(p[0] - pos.x + (dx / d) * st, 0) >= 0 ? st / dt : 0;
  }
  function ctl(a, dt) {
    const w = a.npc;
    if (!Z.on || !isAlly(w)) return false;
    dt = Math.min(dt, 0.1);
    a.t += dt;
    if (a.down) {
      w.fig.mode = 'sit';
      w.fig.anim(dt, 0);
      return true;
    }
    w.fig.mode = 'stand';
    const pos = { x: w.x, y: w.y, z: floorAt(w.x, w.y, P.feet + 1) };
    const e = w.talking ? null : foe(w.x, w.y);
    let tx = w.x,
      ty = w.y,
      v = 0;
    if (e) {
      const d = hyp(e.x - w.x, e.y - w.y);
      w.az = Math.atan2(e.x - w.x, e.y - w.y);
      if (d > 1.35) {
        tx = e.x;
        ty = e.y;
        v = d > 4 ? 2.6 : 1.5;
        w.fig.pose = null;
      } else {
        // the blow: the axe pose of the yard (npc/npc_real.js POSE.chop, 2.6 s, the strike at 0.56 of it), a little faster
        a.cd -= dt;
        if (!w.fig.pose || w.fig.pose.k !== 'chop') w.fig.pose = { k: 'chop', t: 0 };
        w.fig.pose.t += dt * 0.6;
        const ph = (w.fig.pose.t % 2.6) / 2.6;
        if (ph > 0.56 && !a.strike) {
          a.strike = true;
          ZHORDE.damage(e, 36 + rnd() * 12, {
            dx: e.x - w.x,
            dy: e.y - w.y,
            knock: 1.2,
            kind: 'blade',
            gore: 0.45,
            by: a.who,
          });
          if (rnd() < 0.25) say(a, 'fight');
        } else if (ph < 0.3) a.strike = false;
      }
    } else if (w.talking) {
      // in a talk he stands and looks at the player (the talk panel of npc/npc.js stays usable – Falko 5.11.)
      w.fig.pose = null;
      w.az = Math.atan2(P.x - w.x, P.y - w.y);
    } else {
      w.fig.pose = null;
      if (a.mode === 'folgen') {
        const yaw = (P.yaw * Math.PI) / 180,
          side = a.who === 'hubert' ? 1 : -1,
          bx = P.x - Math.sin(yaw) * 2.2 + Math.cos(yaw) * side * 1.2,
          by = P.y - Math.cos(yaw) * 2.2 - Math.sin(yaw) * side * 1.2,
          d = hyp(bx - w.x, by - w.y);
        if (d > 1.2) {
          tx = bx;
          ty = by;
          v = d > 10 ? 3.2 : d > 4 ? 2.2 : 1.2;
          w.az = Math.atan2(bx - w.x, by - w.y);
        } else w.az = Math.atan2(P.x - w.x, P.y - w.y);
        // far behind (a jump in the menu, a drive): he catches up
        if (hyp(P.x - w.x, P.y - w.y) > 60) {
          w.x = P.x - Math.sin(yaw) * 3;
          w.y = P.y - Math.cos(yaw) * 3;
        }
      } else {
        const d = hyp(a.gx - w.x, a.gy - w.y);
        if (d > 0.6) {
          tx = a.gx;
          ty = a.gy;
          v = 1.3;
          w.az = Math.atan2(a.gx - w.x, a.gy - w.y);
        }
      }
    }
    const x0 = w.x,
      y0 = w.y;
    moveTo(a, pos, tx, ty, v, dt);
    w.x = pos.x;
    w.y = pos.y;
    const sp = hyp(w.x - x0, w.y - y0) / Math.max(dt, 1e-3);
    w.v = sp;
    w.fig.anim(dt, sp);
    return true;
  }
  // survivors (own figures) – the same, simpler
  function stepFig(a, dt) {
    const F = a.F;
    if (!F) return;
    if (a.dead) {
      a.deadT += dt;
      F.mode = 'dead';
      F.anim(dt, true);
      if (a.deadT > 25) {
        // risen again – as one of them
        const e = ZHORDE.ent(a.who, a.x, a.y, a.z, a.hd, { st: 'turn' });
        e.turnT = 4;
        F.dispose();
        S.list = S.list.filter(q => q !== a);
        PLAY.think(a.name + ' steht wieder auf …', 3000);
      }
      return;
    }
    if (a.mode === 'versteckt') {
      F.mode = 'eat';
      F.anim(dt, true);
      return;
    }
    const e = foe(a.x, a.y);
    let tx = a.x,
      ty = a.y,
      v = 0;
    if (e) {
      const d = hyp(e.x - a.x, e.y - a.y);
      a.hd = (Math.atan2(e.x - a.x, e.y - a.y) * 180) / Math.PI;
      if (d > 1.3) {
        tx = e.x;
        ty = e.y;
        v = 2.4;
      } else {
        a.cd -= dt;
        if (a.cd <= 0) {
          a.cd = 1.2 + rnd() * 0.4;
          F.play('chop', 0.9);
          setTimeout(() => {
            if (!e.dead && hyp(e.x - a.x, e.y - a.y) < 1.8)
              ZHORDE.damage(e, 28 + rnd() * 10, { dx: e.x - a.x, dy: e.y - a.y, knock: 1.0, kind: 'blunt', by: a.who });
          }, 420);
        }
      }
    } else if (a.mode === 'folgen') {
      const yaw = (P.yaw * Math.PI) / 180,
        bx = P.x - Math.sin(yaw) * 2.6 + Math.cos(yaw) * 0.8,
        by = P.y - Math.cos(yaw) * 2.6 - Math.sin(yaw) * 0.8,
        d = hyp(bx - a.x, by - a.y);
      if (d > 1.2) {
        tx = bx;
        ty = by;
        v = d > 6 ? 2.8 : 1.3;
        a.hd = (Math.atan2(bx - a.x, by - a.y) * 180) / Math.PI;
      }
      if (hyp(P.x - a.x, P.y - a.y) > 60) {
        a.x = P.x - Math.sin(yaw) * 3;
        a.y = P.y - Math.cos(yaw) * 3;
      }
    } else if (hyp(a.gx - a.x, a.gy - a.y) > 0.6) {
      tx = a.gx;
      ty = a.gy;
      v = 1.3;
      a.hd = (Math.atan2(a.gx - a.x, a.gy - a.y) * 180) / Math.PI;
    }
    const x0 = a.x,
      y0 = a.y,
      pos = { x: a.x, y: a.y, z: a.z };
    moveTo(a, pos, tx, ty, v, dt);
    a.x = pos.x;
    a.y = pos.y;
    a.z = floorAt(a.x, a.y, a.z + 0.45);
    const sp = hyp(a.x - x0, a.y - y0) / Math.max(dt, 1e-3);
    F.mode = sp > 1.4 ? 'chase' : sp > 0.05 ? 'walk' : 'idle';
    F.speed = sp;
    F.g.position.copy(V(a.x, a.y, a.z));
    F.g.rotation.y = (-a.hd * Math.PI) / 180;
    F.anim(dt, true);
  }
  // ---- the action button: ask the neighbours, tell an ally to wait or to come ----
  for (const who of ['hubert', 'ronald']) {
    KERN.act({
      id: 'zbund:' + who,
      r: 3.4,
      // looking at him the talk wins over a bench or a door close by (an ally is always near; Falko: the talk was not offered)
      get prio() {
        const w = NPCS[who];
        if (!w) return 0.55;
        const a = (P.yaw * Math.PI) / 180,
          dx = w.x - P.x,
          dy = w.y - P.y,
          d = Math.hypot(dx, dy) || 1;
        return (dx * Math.sin(a) + dy * Math.cos(a)) / d > 0.85 ? 2.5 : 0.55;
      },
      pos: () => {
        const w = NPCS[who];
        return w && w.fig && w.fig.g.visible ? [w.x, w.y, P.feet + 1.4] : null;
      },
      // an ally is close to the player most of the time – among benches, doors and things the talk with him must not get lost (Falko
      // 5.11.: „ich möchte auch wenn mir Hubert und Ronald folgen bzw. im Team sind noch ihnen reden können“); not yet with us: the
      // game's own button (game/play.js „Mit … sprechen“) – the questions of the night are topics of the talk
      label: () => {
        const w = NPCS[who];
        if (!Z.on || !w || !w.fig || !w.fig.g.visible || w.drive || NPCUI.cur()) return null;
        const a = S.list.find(q => q.npc === w),
          n = who === 'hubert' ? 'Hubert' : 'Ronald';
        if (!a) return null;
        if (a.down) return n + ' aufhelfen (Verbandskasten)';
        return 'Mit ' + n + ' sprechen';
      },
      run: () => {
        const w = NPCS[who],
          a = S.list.find(q => q.npc === w);
        if (!a) return;
        if (a.down) {
          if (!Z.use('verband')) return PLAY.think('Ich brauche einen Verbandskasten.', 1800);
          a.down = false;
          a.hp = a.hp0 * 0.6;
          w.fig.mode = 'stand';
          return say(a, 'follow');
        }
        NPCUI.start(w);
      },
    });
  }
  // ---- in the talk with Hubert or Ronald: the night's questions as topics (game/quests.js topics/ask, ours start with 'q_z') ----
  function zTopics(who) {
    const w = NPCS[who];
    if (!Z.on || !w) return [];
    const a = S.list.find(q => q.npc === w);
    if (!a)
      return [
        {
          k: 'q_zhilf',
          label: who === 'ronald' ? 'Kommst du mit? (etwas zu essen geben)' : 'Hilfst du mir gegen die Zombies?',
        },
      ];
    if (a.down) return [{ k: 'q_zauf', label: 'Ich helf dir auf (Verbandskasten)' }];
    return [
      a.mode === 'folgen' ? { k: 'q_zwart', label: 'Warte hier' } : { k: 'q_zkomm', label: 'Komm mit' },
      { k: 'q_zlage', label: 'Wie sieht’s aus?' },
    ];
  }
  function zAsk(who, k) {
    const w = NPCS[who],
      a = S.list.find(q => q.npc === w);
    if (k === 'q_zhilf') {
      if (who === 'ronald' && !Z.has('konserve') && !Z.has('glas') && !Z.has('brot'))
        return { text: [line('ronald', 'ask')] };
      return {
        text: [line(who, 'join')],
        after: () => {
          if (who === 'ronald') Z.use(['konserve', 'glas', 'brot'].find(q => Z.has(q)));
          joinNpc(w, who, true);
        },
        end: true,
      };
    }
    if (!a) return { text: ['Was willst du?'] };
    if (k === 'q_zauf') {
      if (!Z.has('verband')) return { text: ['Ohne Verband wird das nichts. Such einen Verbandskasten.'] };
      return {
        text: [line(who, 'follow')],
        after: () => {
          Z.use('verband');
          a.down = false;
          a.hp = a.hp0 * 0.6;
          w.fig.mode = 'stand';
        },
        end: true,
      };
    }
    if (k === 'q_zwart')
      return {
        text: [line(who, 'wait')],
        after: () => {
          a.mode = 'wachen';
          a.gx = w.x;
          a.gy = w.y;
        },
        end: true,
      };
    if (k === 'q_zkomm') return { text: [line(who, 'follow')], after: () => (a.mode = 'folgen'), end: true };
    if (k === 'q_zlage') {
      const n = Z.ents.filter(e => e.kind === 'zombie' && !e.dead && hyp(e.x - w.x, e.y - w.y) < 60).length;
      const hp = Math.round((100 * a.hp) / a.hp0);
      return {
        text: [
          (hp > 70 ? 'Mir geht’s gut. ' : hp > 35 ? 'Hab ein paar abgekriegt. ' : 'Lange halt ich nicht mehr durch. ') +
            (n ? 'In der Nähe sind ' + n + ' von denen.' : 'Gerade ist keiner zu sehen.'),
        ],
      };
    }
    return { text: [''] };
  }
  function hookTalk() {
    const Q = window.QUESTS;
    if (!Q || Q.zbund) return;
    Q.zbund = true;
    const t0 = Q.topics,
      a0 = Q.ask;
    Q.topics = who => [...zTopics(who), ...t0.call(Q, who)];
    Q.ask = (who, k) => (String(k).startsWith('q_z') ? zAsk(who, k) : a0.call(Q, who, k));
  }
  KERN.on('zombie:start', hookTalk);
  if (window.QUESTS) hookTalk();
  // the survivors that follow: wait / come
  KERN.act({
    id: 'zbund:s',
    r: 2.2,
    prio: 0.1,
    pos: () => {
      const a = S.list.find(q => q.F && !q.dead && hyp(q.x - P.x, q.y - P.y) < 2.2);
      return a ? [a.x, a.y, a.z + 1.1] : null;
    },
    label: () => {
      const a = S.list.find(q => q.F && !q.dead && hyp(q.x - P.x, q.y - P.y) < 2.2);
      return a && Z.on ? a.name + (a.mode === 'folgen' ? ': Warte hier' : ': Komm mit') : null;
    },
    run: () => {
      const a = S.list.find(q => q.F && !q.dead && hyp(q.x - P.x, q.y - P.y) < 2.2);
      if (!a) return;
      if (a.mode === 'folgen') {
        a.mode = 'wachen';
        a.gx = a.x;
        a.gy = a.y;
      } else a.mode = 'folgen';
      PLAY.think(a.name + (a.mode === 'folgen' ? ': „Ich komme.“' : ': „Ich warte hier.“'), 1500);
    },
  });
  // ---- per frame (the neighbours are steered from their walkers; here the survivors and the morning) ----
  KERN.tick(dt => {
    if (!Z.on) return;
    dt = Math.min(dt, 0.1);
    for (const a of S.list) if (a.F) stepFig(a, dt);
    for (const a of S.hidden || []) if (a.F) stepFig(a, dt);
  }, 'zombie/bund');
  // the morning: the hurt neighbours are up again
  KERN.on('zombie:survived', () => {
    for (const a of S.list)
      if (a.npc && a.down) {
        a.down = false;
        a.hp = a.hp0;
        a.npc.fig.mode = 'stand';
      }
  });
  // leaving the night mode: the neighbours go back to their day, the survivors home
  function release() {
    for (const a of S.list) {
      if (a.npc) {
        a.npc.ctl = null;
        a.npc.keep = null;
        a.npc.fig.pose = null;
        a.npc.fig.mode = 'stand';
        if (a.npc.prop) a.npc.prop.visible = false;
        a.npc.prop = null;
      } else if (a.F) a.F.dispose();
    }
    for (const a of S.hidden || []) {
      if (a.F) a.F.dispose();
      KERN.unact('zbund:s:' + a.who);
    }
    S.list = [];
    S.hidden = [];
  }
  KERN.on('zombie:stop', release);
  // a reload: the clan's neighbours come back
  KERN.on('zombie:start', d => {
    if (d && d.fresh) return;
    for (const who of Z.clan.members || [])
      if ((who === 'hubert' || who === 'ronald') && NPCS[who]) joinNpc(NPCS[who], who);
  });
  Object.assign(S, { joinNpc, survivor, isAlly, release, line, prop });
  return S;
})();
window.ZBUND = ZBUND;
