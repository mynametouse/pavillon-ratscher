// ===================== feat/strategie-dorf: crisis missions with the volunteer fire brigade (STDKRISE) =====================
// Falko 5.11.2026 23:30 (C&C 3 / StarCraft, all four – among them „Krisen-Einsätze“): a storm throws spruces across the track to the Klinge,
// a cloudburst makes the brook rise at the garden's culvert, a ground fire at the edge of the Klinge after weeks without rain. Real
// procedures: the emergency call, the control centre alarms by pager and the siren on the old school, whoever is in the village drives to
// the fire station; by day on a working day only a few are there (the commuters – „Tagesalarmsicherheit“), so who you send matters. The
// fire brigade works on its own; your people (and the neighbours, by day) help under its lead – the time counts until the damage happens.
// Tied to the weather the core reads (feat/wetter live or the climate by date): the core's storm event, heavy rain, dry weeks.
// State: STRAT.S.ext.krise (saved with pav-strat-v1, checked on load). Things in the world: strategie/st_dorf_welt.js.
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { CLOCK } from '../time/clock.js';
import { P } from '../game/walkable.js';
import { ROADS } from '../world/roads.js';
import { STREAM } from '../garden/stream_geo.js';
import { AMT } from '../amt/amt.js';
import { AMTMODEL } from '../amt/amt_model.js';
import { SAVE } from '../core/save.js';
import { STDATA } from './st_data.js';
import { STRAT } from './st_modus.js';
import { STDDATA } from './st_dorf_data.js';
export const STDKRISE = (() => {
  const D = STDDATA,
    K = D.KRISEN,
    FW = D.FW,
    S = STRAT.S,
    W = STRAT.W;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const now = () => CLOCK.t;
  const dayOf = t => Math.floor(t / 1440);
  const pname = id => (STDATA.PEOPLE[id] ? STDATA.PEOPLE[id].name : id);
  const names = ks =>
    ks
      .map(pname)
      .join(', ')
      .replace(/, ([^,]*)$/, ' und $1');
  const fin = (v, d) => (Number.isFinite(v) ? v : d);
  // ---------------- the state, checked (STRAT.S.ext.krise: { cur, log }) ----------------
  function sanitize(s) {
    const o = { cur: null, log: [], last: {} };
    if (!s || typeof s !== 'object') return o;
    const c = s.cur;
    if (c && typeof c === 'object' && Object.prototype.hasOwnProperty.call(K, c.id) && Number.isFinite(c.t0)) {
      const pt = v => Array.isArray(v) && v.length >= 2 && v.every(Number.isFinite);
      o.cur = {
        id: c.id,
        t0: c.t0,
        pos: pt(c.pos) ? c.pos.slice(0, 2) : null,
        sev: Math.max(1, Math.min(3, fin(c.sev, 1) | 0)),
        crew: Math.max(0, Math.min(20, fin(c.crew, 3) | 0)),
        need: Math.max(10, Math.min(5000, fin(c.need, 200))),
        limit: fin(c.limit, c.t0 + 120),
        own: Math.max(0, fin(c.own, 0)),
        fw: Math.max(0, fin(c.fw, 0)),
        tl: fin(c.tl, c.t0),
        done: Number.isFinite(c.done) ? c.done : null,
        ok: c.ok === true ? true : c.ok === false ? false : null,
        late: c.late === true,
        helped: Array.isArray(c.helped) ? c.helped.filter(x => typeof x === 'string').slice(0, 8) : [],
        until: Number.isFinite(c.until) ? c.until : null,
        wait: c.wait === true,
      };
    }
    if (Array.isArray(s.log))
      o.log = s.log
        .filter(e => Array.isArray(e) && typeof e[0] === 'string' && Number.isFinite(e[1]))
        .map(e => [e[0], e[1], e[2] === true])
        .slice(-12);
    if (s.last && typeof s.last === 'object')
      for (const k of Object.keys(K)) if (Number.isFinite(s.last[k])) o.last[k] = s.last[k];
    return o;
  }
  const st = () => {
    const x = S.ext.krise;
    if (!x || !Array.isArray(x.log) || !x.last || !('cur' in x)) S.ext.krise = sanitize(x);
    return S.ext.krise;
  };
  STRAT.onLoad.push(() => {
    S.ext.krise = sanitize(S.ext.krise);
  });
  const cur = () => st().cur;
  const active = () => !!(cur() && cur().done == null);
  // a mission planned for later in the day (the events roll at midnight): it is there only from its alarm on
  const live = () => active() && !cur().wait;
  // ---------------- where it happens ----------------
  function posOf(id) {
    try {
      if (id === 'baum') {
        const R = ROADS.routes && ROADS.routes.klinge;
        if (R && R.length > 4) {
          // a stretch of the field track between the village and the forest: 40 % along the route from the garden
          let L = 0;
          const seg = [];
          for (let i = 1; i < R.length; i++) {
            const d = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]);
            seg.push(d);
            L += d;
          }
          let a = L * 0.4;
          for (let i = 1; i < R.length; i++) {
            if (a <= seg[i - 1]) {
              const k = a / seg[i - 1];
              return [R[i - 1][0] + (R[i][0] - R[i - 1][0]) * k, R[i - 1][1] + (R[i][1] - R[i - 1][1]) * k];
            }
            a -= seg[i - 1];
          }
        }
        return [-210, -260];
      }
      if (id === 'hochwasser') return STREAM.wpt(STREAM.TB, STREAM.OFF);
      if (id === 'waldbrand') {
        const c = STRAT.place.pos('klinge') || [-579, -590];
        return [c[0] + 35, c[1] + 28];
      }
    } catch (e) {
      console.warn('strategie-dorf krise pos', e);
    }
    return [0, 0];
  }
  // who of the fire brigade comes: by day on a working day only a few (they work in town), else most of them
  function crewAt(t) {
    const dy = W.day(t),
      m = W.minOf(t),
      work = dy.wd >= 1 && dy.wd <= 5 && !dy.hol && m >= 6 * 60 && m < 17 * 60 + 30;
    // your people who did the basic training are members: the pager alarms them too when they are in Ratscher
    const own = Object.keys(S.people).filter(
      id => STRAT.isOwn(id) && S.people[id].certs.includes('feuerwehr') && STRAT.present(id, t).ok
    ).length;
    return (work ? FW.crewDay : FW.crew) + own;
  }
  // ---------------- a crisis begins: the alarm ----------------
  function start(id, o = {}) {
    if (!K[id]) return { no: true, text: 'Unbekannte Lage.' };
    if (active()) return { no: true, text: 'Es läuft schon ein Einsatz.' };
    const Kd = K[id],
      t = Number.isFinite(o.t) ? o.t : now(),
      sev = Math.max(1, Math.min(3, o.sev || 2));
    const c = {
      id,
      t0: Math.round(t),
      pos: o.pos || posOf(id),
      sev,
      crew: crewAt(t),
      need: Math.round(Kd.need * (0.6 + 0.2 * sev)),
      limit: Math.round(t + Kd.limit),
      own: 0,
      fw: 0,
      tl: Math.round(t),
      done: null,
      ok: null,
      late: false,
      helped: [],
      until: null,
      wait: t > now() + 1,
    };
    st().cur = c;
    st().last[id] = Math.round(t);
    if (!c.wait) alarm(c);
    STRAT.save();
    markDirty(true);
    return { ok: true, c };
  }
  function alarm(c) {
    const Kd = K[c.id],
      arrive = Math.round(c.t0 + FW.alarm + FW.drive);
    STRAT.note(
      `Einsatz! ${Kd.title}. ${Kd.text} Die Feuerwehr Ratscher rückt aus (${c.crew} Leute${c.crew <= FW.crewDay ? ' – werktags tagsüber sind die meisten in der Stadt' : ''}), an der Einsatzstelle um ${hm(arrive)} Uhr.`,
      {
        kind: 'ereignis',
        why: FW.learn,
        src: FW.src,
        acts: [
          { label: 'Leute hinschicken', fn: () => dispatch() },
          { label: 'Hinsehen', fn: () => look() },
        ],
      }
    );
    STRAT.emit('krise', { id: c.id, state: 'alarm', t: c.t0 });
  }
  const hm = t => {
    const m = ((Math.floor(t) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };
  // from above: the camera over the site, its panel open
  function look() {
    const c = cur();
    if (!c || !c.pos) return 'Kein Einsatz.';
    if (S.on && P.mode === 'top') {
      P.tx = c.pos[0];
      P.ty = c.pos[1];
      P.th = Math.min(P.th, 110);
      if (STRAT.ui && STRAT.ui.openPlace) STRAT.ui.openPlace('einsatz');
      markDirty(true);
    }
    return K[c.id].title + ': ' + K[c.id].phases[0][1];
  }
  // send whoever can help: your people on site first (up to two), by day the neighbours
  function dispatch(who) {
    const c = cur();
    if (!c || c.done != null || c.wait) return 'Kein Einsatz.';
    const free = Object.keys(S.people).filter(id => STRAT.present(id).ok && !(S.people[id].hurt > now()));
    const own = free.filter(id => STRAT.isOwn(id));
    const nb = free.filter(id => !STRAT.isOwn(id));
    let pick = who && who.length ? who : own.slice(0, 2);
    if (!pick.length) pick = nb.slice(0, 2);
    if (!pick.length) return 'Gerade ist niemand von euch in Ratscher – die Feuerwehr ist auf sich gestellt.';
    const r = STRAT.job.add('einsatz', pick, { place: 'einsatz' });
    if (r && r.no) return r.text;
    return `${names(pick)} ${pick.length > 1 ? 'fahren' : 'fährt'} zur Einsatzstelle und ${pick.length > 1 ? 'melden sich' : 'meldet sich'} beim Einsatzleiter.`;
  }
  // ---------------- the work: the fire brigade's crew from its arrival, your helpers through the job ----------------
  STRAT.place.define({
    id: 'einsatz',
    name: 'Einsatzstelle',
    icon: '⚠',
    order: 1,
    r: 14,
    pos: () => (live() && cur().pos ? cur().pos : null),
    sub: () => (live() ? K[cur().id].title : ''),
    info: () => (live() ? html() : ''),
    badge: () => (live() ? 'noch ' + CLOCK.dur(Math.max(0, cur().limit - now())) : ''),
  });
  STRAT.job.define({
    id: 'einsatz',
    label: 'Der Feuerwehr helfen',
    place: 'einsatz',
    order: 1,
    people: [1, 3],
    skill: 'holz',
    min: 1,
    heavy: 0.8,
    xp: 1.5,
    where: 'dorf',
    anytime: true,
    text: 'Unter der Leitung des Einsatzleiters: absichern, tragen, räumen, Sandsäcke füllen, Wasser schleppen – nur was man darf und kann.',
    learn:
      'Helfer an einer Einsatzstelle melden sich beim Einsatzleiter und arbeiten nur in seinem Auftrag – wer auf eigene Faust losläuft, gefährdet sich und die Einsatzkräfte.',
    dur: 900,
    show: () => live(),
    can: () => (live() ? null : { no: true, text: 'Gerade ist kein Einsatz.' }),
    pose: 'carry',
    step: (j, cx, dw) => {
      const c = cur();
      if (!c || c.done != null) return;
      // your helpers: their minutes of work (each person), better with the skill the situation needs
      const Kd = K[c.id],
        sk = Math.max(...j.who.map(id => STRAT.skillOf(id, Kd.skill))),
        n = j.who.length,
        fw = j.who.filter(id => S.people[id].certs.includes('feuerwehr')).length;
      c.own += dw * (n + 0.3 * fw) * (0.7 + 0.1 * sk);
      for (const id of j.who) if (!c.helped.includes(id)) c.helped.push(id);
    },
    finish: () => ({ text: 'Einsatz beendet' }),
  });
  function progress(c, t) {
    const arrive = c.t0 + FW.alarm + FW.drive;
    // the fire brigade's minutes since it arrived (the crew together), the neighbouring town's after a while for a forest fire
    const fwMin = Math.max(0, Math.min(t, c.done != null ? c.done : t) - arrive);
    const extra = c.id === 'waldbrand' ? Math.max(0, Math.min(t, c.done != null ? c.done : t) - (c.t0 + 20)) * 5 : 0;
    // (the tank fire engine from Schleusingen: further vehicles within 20 minutes of the alarm, § 3 (4) ThürFwOrgVO)
    // the fire-fighting rucksacks the Ortsteil paid for (strategie/st_dorf.js, project „Feuerwehr“): a quicker first attack on a ground fire
    const kit =
      c.id === 'waldbrand' && S.ext.dorf && S.ext.dorf.built && S.ext.dorf.built.loeschrucksack != null ? 1.3 : 1;
    c.fw = fwMin * c.crew * kit + extra;
    return Math.min(1, (c.fw + c.own) / c.need);
  }
  // each half second: the work, the time limit, the end – also in a time-lapse (the dates are game minutes)
  let acc = 0;
  KERN.tick(dt => {
    if ((acc += dt) < 0.5 || S.t == null) return;
    acc = 0;
    const c = cur();
    if (!c) return;
    const t = now();
    if (c.wait) {
      if (t < c.t0) return;
      c.wait = false;
      alarm(c);
      STRAT.save();
    }
    if (c.done != null) {
      // the things of a finished mission stay a few days (strategie/st_dorf_welt.js), then the mission is history
      if (c.until != null && t > c.until) {
        st().cur = null;
        STRAT.save();
        markDirty(true);
      }
      return;
    }
    const k = progress(c, t);
    if (!c.late && t > c.limit && k < 1) {
      c.late = true;
      damage(c, t);
    }
    if (k >= 1) end(c, t);
  }, 'strategie/dorf-krise');
  function damage(c, t) {
    const Kd = K[c.id];
    STRAT.note(`${Kd.title}: ${Kd.damage}`, { kind: 'nein', why: Kd.safety, src: Kd.safetySrc });
    if (Kd.cost) STRAT.book(-Kd.cost, Kd.title + ': Schaden beseitigen', 'schaden');
    STRAT.emit('krise', { id: c.id, state: 'schaden', t });
  }
  // the end: in time or not; who helped is remembered in the village (the opinions of the Ortsvorsteher system)
  function end(c, t) {
    const Kd = K[c.id];
    // the moment the work was done (the tick may come late in a time-lapse): back from the progress
    const rate = c.crew + (c.helped.length ? c.helped.length * 0.9 : 0);
    const over = rate > 0 ? Math.max(0, (c.fw + c.own - c.need) / rate) : 0;
    c.done = Math.round(Math.max(c.t0, t - over));
    c.ok = c.done <= c.limit;
    // a long time-lapse may bring the end before the tick saw the limit pass: the damage still happened
    if (!c.ok && !c.late) {
      c.late = true;
      damage(c, t);
    }
    if (c.ok) c.late = false;
    c.until = Math.round(c.done + (c.id === 'waldbrand' ? 30 : 7) * 1440);
    for (const j of STRAT.job.running()) if (j.def === 'einsatz') j.done = j.dur;
    const helped = c.helped.length > 0,
      A = AMT.ST;
    if (helped) {
      for (const [k, d] of Object.entries(Kd.fans))
        AMTMODEL.change(A, k, d, 'Ihr habt beim Einsatz geholfen: ' + Kd.title, t);
      try {
        SAVE.set('pav-amt-v1', A);
      } catch (e) {}
      STRAT.style(c.ok ? 4 : 2, 'Beim Einsatz geholfen: ' + Kd.title);
    }
    st().log.push([c.id, c.done, !!c.ok]);
    if (st().log.length > 12) st().log.shift();
    STRAT.note(
      `${Kd.title}: ${c.ok ? Kd.ok : 'Geschafft – aber zu spät.'} Einsatzdauer ${CLOCK.dur(c.done - c.t0)}${helped ? `, geholfen haben ${names(c.helped)}` : ''}.`,
      { kind: c.ok ? 'fertig' : 'nein', why: Kd.safety, src: Kd.safetySrc }
    );
    STRAT.emit('krise', {
      id: c.id,
      state: c.ok ? 'geschafft' : 'zu spät',
      ok: !!c.ok,
      t: c.done,
      helped: c.helped.slice(),
    });
    STRAT.save();
    markDirty(true);
  }
  // ---------------- the panel of the mission ----------------
  function html() {
    const c = cur(),
      Kd = K[c.id],
      t = now(),
      k = progress(c, t),
      arrive = c.t0 + FW.alarm + FW.drive;
    let h = `<h4>Lage</h4><div class="sub">${esc(Kd.text)}</div><ul><li><span>Alarm</span><b>${hm(c.t0)}</b></li><li><span>Feuerwehr Ratscher (${c.crew})</span><b>${t < arrive ? 'unterwegs, an ' + hm(arrive) : 'vor Ort'}</b></li><li><span>Zeit bis zum Schaden</span><b>${t < c.limit ? CLOCK.dur(c.limit - t) : 'vorbei'}</b></li><li><span>Erledigt</span><b>${Math.round(k * 100)} %</b></li></ul><span class="bar"><u style="width:${Math.round(k * 100)}%"></u></span>`;
    h += `<h4>Ablauf</h4><ul>${Kd.phases.map(([f, txt]) => `<li><span>${f <= k ? '✓' : '·'} ${esc(txt)}</span></li>`).join('')}</ul>`;
    h += `<div class="learn">${esc(Kd.safety)} <small>Quelle: ${esc(Kd.safetySrc)}</small></div><div class="learn">${esc(FW.learn)} <small>Quelle: ${esc(FW.src)}</small></div>`;
    return h;
  }
  // ---------------- the layer: the mission on the map (the site, the fire engine on its way, the clock to the damage) ----------------
  STRAT.layer.define({
    id: 'einsatz',
    label: 'Einsätze',
    text: 'Feuerwehr und Helfer: Einsatzstelle, Anfahrt, Zeit bis zum Schaden',
    order: 6.5,
    on: true,
    draw: pr => {
      const c = cur();
      if (!c || !c.pos || c.wait) return '';
      const t = now(),
        q = pr(c.pos[0], c.pos[1], 1);
      if (q[2] >= 1) return '';
      const Kd = K[c.id];
      let h = '';
      if (c.done == null) {
        const k = progress(c, t),
          R = 20,
          a = k * Math.PI * 2;
        h += `<g class="ek"><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${R}" fill="rgba(216,50,42,.22)" stroke="#d8322a" stroke-width="2.5"/><path d="M${q[0].toFixed(1)} ${(q[1] - R - 5).toFixed(1)} A${R + 5} ${R + 5} 0 ${k > 0.5 ? 1 : 0} 1 ${(q[0] + Math.sin(a) * (R + 5)).toFixed(1)} ${(q[1] - Math.cos(a) * (R + 5)).toFixed(1)}" fill="none" stroke="#ffd34d" stroke-width="3"/><text x="${q[0].toFixed(1)}" y="${(q[1] + 5).toFixed(1)}" text-anchor="middle" style="fill:#fff;font:700 15px system-ui">${Kd.icon}</text><text x="${(q[0] + R + 8).toFixed(1)}" y="${(q[1] - 4).toFixed(1)}" style="fill:#ffd9d4;font:600 11px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.75);stroke-width:3px">${esc(Kd.title)}</text><text x="${(q[0] + R + 8).toFixed(1)}" y="${(q[1] + 10).toFixed(1)}" style="fill:#fff;font:600 10.5px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.75);stroke-width:3px">${t < c.limit ? 'noch ' + esc(CLOCK.dur(c.limit - t)) : 'Schaden!'} · ${Math.round(k * 100)} %</text></g>`;
        // the fire engine from the fire station (the old school) to the site
        const sc = STRAT.place.pos('schule'),
          a0 = c.t0 + FW.alarm,
          a1 = a0 + FW.drive;
        if (sc && t < a1) {
          const f = Math.max(0, Math.min(1, (t - a0) / FW.drive)),
            x = sc[0] + (c.pos[0] - sc[0]) * f,
            y = sc[1] + (c.pos[1] - sc[1]) * f,
            p = pr(x, y, 1.5);
          if (p[2] < 1)
            h += `<g class="fw"><rect x="${(p[0] - 11).toFixed(1)}" y="${(p[1] - 7).toFixed(1)}" width="22" height="14" rx="3" fill="#c8211b" stroke="#fff" stroke-width="1.2"/><text x="${p[0].toFixed(1)}" y="${(p[1] + 3.5).toFixed(1)}" text-anchor="middle" style="fill:#fff;font:700 8.5px system-ui">${t < a0 ? 'ALARM' : 'FW ' + c.crew}</text></g>`;
        }
      } else
        h += `<g class="ek"><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="9" fill="${c.ok ? 'rgba(140,210,90,.5)' : 'rgba(216,120,42,.5)'}" stroke="#fff" stroke-width="1.2"/><text x="${(q[0] + 13).toFixed(1)}" y="${(q[1] + 4).toFixed(1)}" style="fill:#fff;font:600 10.5px system-ui;paint-order:stroke;stroke:rgba(0,0,0,.7);stroke-width:3px">${c.ok ? 'Einsatz beendet' : 'Schaden'}</text></g>`;
      return h;
    },
  });
  // ---------------- what sets it off: the weather of the one world ----------------
  // the core's storm (strategie/st_ereignis.js 'sturm': the windthrow in the Klinge) – often it also throws trees across the track
  KERN.on('strategie:ereignis', d => {
    if (!d || d.id !== 'sturm' || active()) return;
    const h = S.happened && S.happened[S.happened.length - 1],
      t = h && h.id === 'sturm' ? h.t : now();
    if (STRAT.C.rng((t | 0) * 17)() < 0.6)
      start('baum', { t: t + 60, sev: 1 + Math.floor(STRAT.C.rng((t | 0) * 31)() * 3) });
  });
  // heavy rain: a day whose weather brings a cloudburst (summer thunderstorms, autumn rain on wet ground)
  STRAT.event.define({
    id: 'dorf_hochwasser',
    label: 'Starkregen',
    why: 'Starkregen kann kleine Bäche in Minuten anschwellen lassen; gefährlich wird es, wo Treibgut einen Durchlass verstopft.',
    src: 'Deutscher Wetterdienst, Unwetterwarnungen Starkregen; BBK Ratgeber Hochwasser',
    chance: cx => {
      if (active() || now() - (st().last.hochwasser || -1e9) < 20 * 1440) return 0;
      const mo = cx.date.getUTCMonth();
      return cx.wx.rain >= 2.5 ? (mo >= 4 && mo <= 7 ? 0.2 : 0.08) : 0;
    },
    run: cx => {
      const r = start('hochwasser', { t: cx.t + 15 * 60, sev: 2 });
      return r && r.ok ? { text: 'Starkregen am Nachmittag – der Bach am Garten steigt.' } : false;
    },
  });
  // a forest fire: April to September after many dry days (the climate of Meiningen, day by day – or the live weather)
  STRAT.event.define({
    id: 'dorf_waldbrand',
    label: 'Waldbrandgefahr',
    why: 'Nach langer Trockenheit brennen Gras, Reisig und Nadelstreu schon an einem Funken; der Waldbrandgefahrenindex steigt auf Stufe 4 oder 5.',
    src: 'Deutscher Wetterdienst, Waldbrandgefahrenindex; § 12 Thüringer Waldgesetz',
    chance: cx => {
      const mo = cx.date.getUTCMonth();
      if (active() || mo < 3 || mo > 8 || now() - (st().last.waldbrand || -1e9) < 40 * 1440) return 0;
      let dry = 0;
      for (let k = 1; k <= 10; k++) if ((W.wx(cx.t - k * 1440 + 13 * 60).rain || 0) === 0) dry++;
      return dry >= 9 ? (cx.wx.cloud < 0.35 ? 0.05 : 0.025) : 0;
    },
    run: cx => {
      const r = start('waldbrand', { t: cx.t + 14 * 60, sev: 2 });
      return r && r.ok
        ? { text: 'Wochen ohne Regen: Waldbrandgefahr. Am Nachmittag steigt Rauch über der Klinge auf.' }
        : false;
    },
  });
  // the live weather (feat/wetter, near the clock): a real cloudburst outside is one here too
  let liveDay = null;
  KERN.tick(() => {
    if (!S.on || active()) return;
    const t = now(),
      wx = W.wx(t);
    if (wx && wx.rain >= 10 && /Wetter|live|draußen/i.test(wx.src || '') && liveDay !== dayOf(t)) {
      liveDay = dayOf(t);
      start('hochwasser', { sev: 2 });
    }
  }, 'strategie/dorf-krise-live');
  // the chapter's goal: help at a mission
  if (STRAT.chapter.goal)
    STRAT.chapter.goal('k5', {
      id: 'einsatz',
      text: 'Bei einem Einsatz der Feuerwehr helfen',
      on: 'krise',
      when: d => (d.state === 'geschafft' || d.state === 'zu spät') && d.helped && d.helped.length > 0,
    });
  KERN.on('reset', () => {
    S.ext.krise = sanitize(null);
  });
  const state = () => {
    const c = cur();
    return c
      ? {
          id: c.id,
          active: c.done == null,
          k: +progress(c, now()).toFixed(3),
          crew: c.crew,
          need: c.need,
          own: Math.round(c.own),
          fw: Math.round(c.fw),
          limit: c.limit,
          done: c.done,
          ok: c.ok,
          late: c.late,
          helped: c.helped.slice(),
          pos: c.pos,
        }
      : null;
  };
  return { start, dispatch, look, state, crewAt, posOf, st };
})();
window.STDKRISE = STDKRISE;
