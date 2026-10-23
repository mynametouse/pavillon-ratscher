// ===================== feat/ortsvorsteher 4: the election of the Ortsvorsteher and the office (AMT) =====================
// Falko, 23.10.2026 2:57: someone says a new Ortsvorsteher is sought and asks whether one would stand; standing, one has to win the people
// over with tasks to be elected; in office one is seen differently, takes Ratscher's concerns to the town hall in Schleusingen and has a
// say in what is decided there. The model is amt/amt_model.js (opinions, promises, the count, the councils), the data amt/amt_data.js, the
// things that change in the village amt/amt_world.js. This module runs it: the letter, the conversations (a button in the villagers' and
// the neighbours' talk panels, a ring at the door), the campaign tasks, the nomination at the town hall, election day in the old school
// with the public count, the office with concerns, the Ortsteilrat and the town council – a panel (#amtpanel) and a folder (#amtbook, O).
// Saved: pav-amt-v1. The town hall is a scene of its own until the walkable Schleusingen has one (seam: AMT.rathaus, see docs).
// Test hooks: window.AMT (state, jump, talk, count …), ?amt=brief|wahlkampf|wahltag|zaehlen|amt|stadtrat.
import * as THREE from 'three';
import { $, BASE, QS, scene, V } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { LOAD, markDirty, whenLoaded } from '../core/assets.js';
import { floorAt, P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { HUD } from '../game/hud.js';
import { audio, toast } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { NPCS, NPCUI } from '../npc/npc.js';
import { CHL, rbPerson } from '../npc/npc_real.js';
import { VILLAGE } from '../world/village.js';
import { WCOL } from '../world/worldcol.js';
import { VEH } from '../vehicles/vehicle.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { DTEXT } from '../dorf/dorf_text.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { DSCHOOL } from '../dorf/dorf_school.js';
import { DORF } from '../dorf/dorf.js';
import { AMTDATA } from './amt_data.js';
import { AMTMODEL } from './amt_model.js';
import { AMTWORLD } from './amt_world.js';
export const AMT = (() => {
  const D = AMTDATA,
    M = AMTMODEL;
  const KEY = 'pav-amt-v1';
  // ---- people: who is there in this build (the villagers of dorf/dorf_text.js, the two neighbours) ----
  const avail = k => !!D.P[k] && (D.P[k].npc ? !!NPCS[k] : !!(DTEXT.P && DTEXT.P[k]));
  const nameOf = k => (DTEXT.P && DTEXT.P[k] ? DTEXT.P[k].name : D.P[k] ? D.P[k].name : k);
  const fullOf = k => (DTEXT.P && DTEXT.P[k] ? DTEXT.P[k].full : D.P[k] ? D.P[k].full : k);
  const roleOf = k => (D.P[k] && D.P[k].opp ? D.P[k].role : DTEXT.P && DTEXT.P[k] ? DTEXT.P[k].role : D.P[k].role);
  // the world as it was before the election: what one already did for people counts (the Friday task, errands, the neighbours' tasks)
  function bonus() {
    const b = {};
    const add = (k, d) => (b[k] = (b[k] || 0) + d);
    try {
      const st = DORF.ST && DORF.ST.step;
      if (st && st !== 'none' && st !== 'invite') for (const k of Object.keys(D.P)) if (!D.P[k].npc) add(k, 3);
      if (st === 'done') for (const k of Object.keys(D.P)) if (!D.P[k].npc) add(k, 4);
      const err = DORF.ST && DORF.ST.err;
      if (err && DTEXT.ERRANDS)
        for (const [id, e] of Object.entries(err))
          if (e && e.st === 'done' && DTEXT.ERRANDS[id]) add(DTEXT.ERRANDS[id].who, 10);
      if (QUESTS && QUESTS.friendly) {
        if (QUESTS.friendly('hubert')) add('hubert', 15);
        if (QUESTS.friendly('ronald')) add('ronald', 12);
      }
    } catch (e) {
      console.warn('amt bonus', e);
    }
    return b;
  }
  let ST = M.sanitize(SAVE.get(KEY));
  const save = () => SAVE.set(KEY, ST);
  // ---- time ----
  const now = () => CLOCK.t;
  const dayOf = t => Math.floor(t / 1440);
  const minOf = t => ((Math.floor(t) % 1440) + 1440) % 1440;
  const dateOf = t => (DN && DN.dateStr ? DN.dateStr(t, true) : 'Tag ' + (dayOf(t) + 1));
  const female = () => !!(window.AVATAR && (window.AVATAR.kind === 'f' || /sarah/i.test(String(window.AVATAR.kind))));
  const TITLE = () => (female() ? 'Ortsvorsteherin' : 'Ortsvorsteher');
  const eStart = () => (ST.eday != null ? ST.eday * 1440 : Infinity);
  const isEday = (t = now()) => ST.eday != null && dayOf(t) === ST.eday;
  const polls = (t = now()) => isEday(t) && minOf(t) >= 8 * 60 && minOf(t) < 18 * 60;
  const counting = (t = now()) => isEday(t) && minOf(t) >= 18 * 60 && minOf(t) < 21 * 60;
  const campaign = () => ST.phase === 'candidate' || ST.phase === 'nominated';
  const office = () => ST.phase === 'office';
  const thursday = (t = now()) => DCAL.wd(t) === 4 && minOf(t) >= 17 * 60 && minOf(t) < 21 * 60;
  // the dates of a by-election: the Sunday at least nine days after the letter; nominations until the Wednesday before, 18 h
  function schedule(t) {
    let d = dayOf(t) + 9;
    while (DCAL.wd(d * 1440 + 600) !== 0) d++;
    ST.eday = d;
    ST.deadline = (d - 4) * 1440 + 18 * 60;
  }
  const L = (k, d, why) => M.change(ST, k, d, why, now());
  const E = (eff, why) => M.effects(ST, eff, why, now());
  const think = (s, ms) => PLAY.think(s, ms || 6500);
  // ======================= the panel (#amtpanel) =======================
  const UI = (() => {
    const host = ($('npcpanel') && $('npcpanel').parentNode) || $('p-3d') || document.body;
    const el = document.createElement('aside');
    el.id = 'amtpanel';
    el.hidden = true;
    el.setAttribute('aria-label', 'Wahl und Amt');
    el.innerHTML =
      '<header><div class="who"><h3></h3><span class="role"></span></div><button type="button" class="x" aria-label="Schließen">×</button></header>' +
      '<div class="task" hidden></div><div class="scene" hidden></div><div class="say"></div><div class="topics"></div>';
    host.appendChild(el);
    const h3 = el.querySelector('h3'),
      role = el.querySelector('.role'),
      task = el.querySelector('.task'),
      scene = el.querySelector('.scene'),
      say = el.querySelector('.say'),
      tp = el.querySelector('.topics');
    const U = { cur: null, at: null, el, onClose: null };
    U.open = (title, sub, text, opts = {}) => {
      U.cur = opts.who || opts.id || 'scene';
      U.at = opts.free ? null : [P.x, P.y];
      h3.textContent = title;
      role.textContent = sub || '';
      say.textContent = text || '';
      el.classList.toggle('wide', !!opts.wide);
      scene.hidden = !opts.scene;
      scene.innerHTML = opts.scene || '';
      U.onClose = opts.onClose || null;
      U.task();
      el.hidden = false;
      if (window.DORF && DORF.UI && DORF.UI.cur) DORF.UI.close();
      if (NPCUI.cur()) NPCUI.end(false);
      markDirty();
    };
    U.say = text => {
      say.textContent = text;
    };
    U.html = h => {
      say.innerHTML = h;
    };
    U.scene = h => {
      scene.hidden = !h;
      scene.innerHTML = h || '';
    };
    U.buttons = list => {
      tp.innerHTML = '';
      for (const b of list) {
        if (!b) continue;
        const [label, fn, cls] = b;
        const e = document.createElement('button');
        e.type = 'button';
        e.textContent = label;
        if (cls) e.className = cls;
        e.addEventListener('click', () => {
          try {
            fn();
          } catch (err) {
            console.warn('amt', err);
          }
          renderBook();
        });
        tp.appendChild(e);
      }
    };
    U.task = () => {
      const s = status();
      task.hidden = !s;
      if (s) task.innerHTML = s;
    };
    U.close = () => {
      if (!U.cur) return;
      U.cur = null;
      el.hidden = true;
      const f = U.onClose;
      U.onClose = null;
      if (f) f();
      doorFigDrop();
      markDirty();
    };
    el.querySelector('.x').addEventListener('click', () => U.close());
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && U.cur) {
        U.close();
        e.stopPropagation();
      }
    });
    return U;
  })();
  const bye = (label = 'Tschüss') => [label, () => UI.close(), 'bye'];
  // the line in the panel's task strip and the HUD: what is next
  function status() {
    const t = now();
    switch (ST.phase) {
      case 'asked':
        return '<b>Nachwahl in Ratscher</b> – am ' + dateOf(eStart() + 600) + '. Stellst du dich zur Wahl?';
      case 'candidate':
        return (
          '<b>Kandidatur</b> – ' +
          M.sigCount(ST) +
          ' von ' +
          D.SIGS +
          ' Unterschriften; einreichen bis ' +
          dateOf(ST.deadline) +
          ', 18 Uhr, im Rathaus Schleusingen.'
        );
      case 'nominated':
        return isEday(t)
          ? '<b>Wahltag</b> – Wahllokal alte Schule, 8 bis 18 Uhr; danach öffentliche Auszählung.'
          : '<b>Wahlkampf</b> – gewählt wird am ' + dateOf(eStart() + 600) + '. Rede mit den Leuten.';
      case 'office': {
        const open = Object.values(ST.anl).filter(a => a.st === 'open').length,
          stadt = Object.values(ST.anl).filter(a => a.st === 'stadt').length;
        return (
          '<b>' +
          TITLE() +
          ' von Ratscher</b>' +
          (open ? ' – ' + open + ' Anliegen für den Ortsteilrat' : '') +
          (stadt ? ' – ' + stadt + ' für den Stadtrat (donnerstags)' : '') +
          (!ST.sworn ? ' – Vereidigung im Stadtrat (donnerstags)' : '')
        );
      }
      case 'lost':
      case 'missed':
        return '<b>Uwe Bachmann ist Ortsvorsteher</b> – vielleicht ergibt sich später eine neue Gelegenheit.';
    }
    return '';
  }
  // ======================= the folder (#amtbook, key O) and the HUD button =======================
  const BOOK = (() => {
    const host = $('p-3d') || document.body;
    const el = document.createElement('aside');
    el.id = 'amtbook';
    el.hidden = true;
    el.setAttribute('aria-label', 'Wahl und Amt – Mappe');
    host.appendChild(el);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hb';
    btn.id = 'amtbtn';
    btn.hidden = true;
    btn.title = 'Wahl und Amt (O)';
    btn.innerHTML =
      '<span class="hbi"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5 12 4l8 5.5"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/><path d="M4 20h16"/></svg></span><span class="hbt">Amt</span><i class="dot" hidden></i>';
    const tr = $('hudtr'),
      mb = $('menubtn');
    if (tr) tr.insertBefore(btn, mb && mb.parentNode === tr ? mb : null);
    btn.addEventListener('click', () => toggleBook());
    // two entries in the menu's „Spiel“ section: the folder, and the trip to the town hall
    const ml = $('invbtn') && $('invbtn').parentNode,
      mk = (id, html, fn) => {
        const e = document.createElement('button');
        e.type = 'button';
        e.className = 'tog';
        e.id = id;
        e.hidden = true;
        e.innerHTML = html;
        e.addEventListener('click', () => {
          if (HUD && HUD.setMenu) HUD.setMenu(false);
          fn();
        });
        if (ml) ml.appendChild(e);
        return e;
      };
    const mBook = mk('amtmenubtn', 'Wahl und Amt<span>O</span>', () => toggleBook(true)),
      mTrip = mk('amttripbtn', 'Ins Rathaus Schleusingen<span>Fahrt</span>', () => trip());
    return { el, btn, tab: 'stand', mBook, mTrip };
  })();
  function toggleBook(v) {
    BOOK.el.hidden = !(v ?? BOOK.el.hidden);
    BOOK.btn.querySelector('.dot').hidden = true;
    renderBook();
  }
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || (window.PIANO && window.PIANO.on))
      return;
    if ((e.key === 'o' || e.key === 'O') && ST.phase !== 'none') {
      toggleBook();
      e.preventDefault();
    }
    if (e.key === 'Escape' && !BOOK.el.hidden) BOOK.el.hidden = true;
  });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ASTXT = {
    open: 'neu – für den Ortsteilrat',
    rat: 'im Ortsteilrat',
    stadt: 'geht an den Stadtrat',
    yes: 'beschlossen',
    no: 'abgelehnt',
    later: 'vertagt',
    kreis: 'beim Landratsamt beantragt',
    built: 'umgesetzt',
    privat: 'keine Sache des Rats',
  };
  function renderBook() {
    UI.task();
    BOOK.btn.hidden = ST.phase === 'none';
    BOOK.mBook.hidden = ST.phase === 'none';
    BOOK.mTrip.hidden = !canTrip();
    if (BOOK.el.hidden) return;
    const tabs = [
      ['stand', 'Stand'],
      ['menschen', 'Menschen'],
      ['versprechen', 'Versprochen'],
      ['anliegen', 'Anliegen'],
      ['lernen', 'So geht’s'],
    ];
    let body = '';
    const t = now();
    if (BOOK.tab === 'stand') {
      body += '<p class="st">' + (status() || 'Noch nichts.') + '</p>';
      const nx = nextSteps();
      if (nx.length) body += '<h4>Was jetzt?</h4><ul>' + nx.map(x => '<li>' + x + '</li>').join('') + '</ul>';
      if (ST.eday != null && ST.phase !== 'office')
        body +=
          '<dl><dt>Wahltag</dt><dd>' +
          dateOf(eStart() + 600) +
          ', 8–18 Uhr, alte Schule</dd><dt>Wahlvorschläge bis</dt><dd>' +
          dateOf(ST.deadline) +
          ', 18 Uhr, Rathaus Schleusingen</dd><dt>Unterschriften</dt><dd>' +
          M.sigCount(ST) +
          ' von ' +
          D.SIGS +
          (ST.sig.length ? ' (' + ST.sig.map(nameOf).join(', ') + (ST.extra ? ' und Nachbarn' : '') + ')' : '') +
          '</dd><dt>Gegenkandidat</dt><dd>' +
          esc(D.T.rival) +
          '</dd></dl>';
      if (campaign()) {
        const x = M.expect(ST, avail);
        body +=
          '<p class="mood">Stimmung im Dorf: <b>' +
          (x > 0.6 ? 'gut für dich' : x > 0.52 ? 'knapp für dich' : x > 0.45 ? 'offen' : 'eher für Uwe') +
          '</b></p>';
        const open = Object.entries(D.TASKS).filter(
          ([k, T]) => T.who && ST.tasks[k] !== 'done' && (!T.who || avail(T.who))
        );
        if (open.length)
          body +=
            '<h4>Aufgaben im Wahlkampf</h4><ul>' +
            open
              .map(
                ([k, T]) =>
                  '<li><b>' +
                  esc(T.title) +
                  '</b> – ' +
                  esc(T.text) +
                  (ST.tasks[k] != null ? ' <em>läuft</em>' : ' <small>(' + nameOf(T.who) + ')</small>') +
                  '</li>'
              )
              .join('') +
            '</ul>';
      }
      if (ST.vote && ST.vote.counted)
        body +=
          '<h4>Ergebnis</h4><p>' +
          ST.vote.turnout +
          ' von ' +
          ST.vote.eligible +
          ' Wahlberechtigten haben gewählt. Du: ' +
          ST.vote.me +
          ', Uwe Bachmann: ' +
          ST.vote.opp +
          ', ungültig: ' +
          ST.vote.inv +
          '.</p>';
      if (office())
        body +=
          '<dl><dt>Im Amt seit</dt><dd>' +
          dateOf(ST.since) +
          '</dd><dt>Geld des Ortsteils</dt><dd>' +
          Math.round(ST.budget) +
          ' Euro übrig in diesem Jahr</dd><dt>Ortsteilrat</dt><dd>' +
          D.ORTSRAT.map(nameOf).join(', ') +
          ' – Vorsitz: du</dd><dt>Stadtrat</dt><dd>donnerstags ab 18 Uhr im Rathaus Schleusingen' +
          (thursday(t) ? ' – <b>heute</b>' : '') +
          '</dd></dl>';
      const acts = [];
      if (canTrip()) acts.push('<button type="button" data-a="rathaus">Ins Rathaus nach Schleusingen fahren</button>');
      if (ST.phase === 'asked' || ST.letter)
        acts.push('<button type="button" data-a="brief">Ingrids Brief lesen</button>');
      if (acts.length) body += '<p class="acts">' + acts.join(' ') + '</p>';
    } else if (BOOK.tab === 'menschen') {
      body +=
        '<p class="hint">Was die Leute von dir halten. Es ändert sich mit dem, was du für sie tust, ob du da bist, was du versprichst – und ob du es hältst.</p><ul class="people">' +
        D.KEYS.filter(avail)
          .map(k => {
            const r = Math.round(ST.rep[k]);
            return (
              '<li><b>' +
              esc(fullOf(k)) +
              '</b><small>' +
              esc(roleOf(k)) +
              (where(k) ? ' · ' + esc(where(k)) : '') +
              '</small><span class="bar"><i style="width:' +
              r +
              '%"></i></span><em>' +
              M.mood(r) +
              (trackPos(k)
                ? ' <button type="button" class="way" data-way="' +
                  k +
                  '">' +
                  (TRK.k === k ? 'zeige ich' : 'Weg') +
                  '</button>'
                : '') +
              '</em></li>'
            );
          })
          .join('') +
        '</ul>';
      const log = ST.log.slice(-8).reverse();
      if (log.length)
        body +=
          '<h4>Zuletzt</h4><ul class="log">' +
          log
            .map(
              ([, k, d, why]) =>
                '<li><b>' + esc(nameOf(k)) + ' ' + (d > 0 ? '+' : '') + Math.round(d) + '</b> ' + esc(why) + '</li>'
            )
            .join('') +
          '</ul>';
    } else if (BOOK.tab === 'versprechen') {
      const ps = Object.entries(ST.pos);
      body += ps.length
        ? '<ul class="pos">' +
          ps
            .map(
              ([i, p]) =>
                '<li><b>' +
                esc(D.ISSUES[i].title) +
                '</b>: „' +
                esc(D.ISSUES[i].opts[p.o].say) +
                '“ <small>gesagt zu ' +
                (p.told.map(nameOf).join(', ') || '–') +
                '</small></li>'
            )
            .join('') +
          '</ul>' +
          (ST.flips
            ? '<p class="hint">Du hast ' + ST.flips + '-mal deine Meinung geändert. Im Dorf merkt man sich das.</p>'
            : '')
        : '<p class="hint">Noch nichts versprochen. Wer fragt, will eine Antwort – und merkt sie sich.</p>';
    } else if (BOOK.tab === 'anliegen') {
      const as = Object.entries(ST.anl);
      body += as.length
        ? '<ul class="anl">' +
          as
            .map(
              ([id, a]) =>
                '<li><b>' +
                esc(D.ANLIEGEN[id].title) +
                '</b> <small>von ' +
                esc(nameOf(D.ANLIEGEN[id].from)) +
                ' · ' +
                {
                  ortsteil: 'entscheidet der Ortsteilrat',
                  stadt: 'entscheidet der Stadtrat',
                  kreis: 'zuständig: Landratsamt',
                  privat: 'keine Ratssache',
                }[D.ANLIEGEN[id].by] +
                '</small><span class="ast ' +
                a.st +
                '">' +
                ASTXT[a.st] +
                '</span>' +
                (a.why ? '<p>' + esc(a.why) + '</p>' : '') +
                '</li>'
            )
            .join('') +
          '</ul>'
        : '<p class="hint">' +
          (office()
            ? 'Noch keine Anliegen. Frag die Leute – oder warte, bis sie zu dir kommen.'
            : 'Anliegen bringen die Leute dem Ortsvorsteher.') +
          '</p>';
    } else body += D.LEARN.map(([h, p]) => '<h4>' + esc(h) + '</h4><p>' + esc(p) + '</p>').join('');
    BOOK.el.innerHTML =
      '<h3>Wahl und Amt<button type="button" class="x" aria-label="Schließen">×</button></h3><nav>' +
      tabs
        .map(
          ([k, l]) =>
            '<button type="button" data-t="' + k + '" aria-selected="' + (BOOK.tab === k) + '">' + l + '</button>'
        )
        .join('') +
      '</nav><div class="body">' +
      body +
      '</div>';
    BOOK.el.querySelector('.x').addEventListener('click', () => toggleBook(false));
    BOOK.el.querySelectorAll('[data-t]').forEach(b =>
      b.addEventListener('click', () => {
        BOOK.tab = b.dataset.t;
        renderBook();
      })
    );
    BOOK.el.querySelectorAll('[data-way]').forEach(b =>
      b.addEventListener('click', () => {
        track(TRK.k === b.dataset.way ? null : b.dataset.way);
        renderBook();
      })
    );
    BOOK.el.querySelectorAll('[data-a]').forEach(b =>
      b.addEventListener('click', () => {
        toggleBook(false);
        if (b.dataset.a === 'rathaus') trip();
        else letter();
      })
    );
  }
  // what one can do next (the folder's first tab): a hint per stage, plainly
  function nextSteps() {
    const t = now(),
      out = [];
    if (ST.phase === 'asked')
      out.push(
        'Sag Ingrid oder jemand anderem im Dorf, dass du antrittst – im Gespräch („Die Nachwahl …“) oder an der Haustür („Bei … klingeln“, 8–21 Uhr).'
      );
    if (ST.phase === 'candidate') {
      const n = M.sigCount(ST);
      if (n < D.SIGS)
        out.push(
          'Unterschriften sammeln: Wer dich ein bisschen kennt, unterschreibt mit seinem Haushalt – damit das Dorf eine Wahl hat; gute Freunde sammeln bei den Nachbarn. Noch ' +
            (D.SIGS - n) +
            '.'
        );
      else out.push('Den Wahlvorschlag im Rathaus Schleusingen einreichen – mit dem Auto oder unten „Ins Rathaus“.');
    }
    if (campaign()) {
      const quiet = D.KEYS.filter(k => avail(k) && !D.P[k].opp && ST.met[k] == null).map(nameOf);
      if (quiet.length) out.push('Noch nicht gesprochen: ' + quiet.join(', ') + '.');
      if (DCAL.until('skat', t) < 3 * 1440 && ST.tasks.vorstellen !== 'done')
        out.push('Freitagabend in der alten Schule: Dort sind alle – eine gute Gelegenheit, dich vorzustellen.');
    }
    if (office()) {
      if (Object.values(ST.anl).some(a => a.st === 'open'))
        out.push('Ortsteilrat einberufen: abends (17–22 Uhr) an der Tür der alten Schule.');
      if (Object.values(ST.anl).some(a => a.st === 'stadt') || !ST.sworn)
        out.push('Donnerstags ab 17 Uhr in den Stadtrat nach Schleusingen (Auto oder unten „Ins Rathaus“).');
      if (Object.values(ST.anl).some(a => (a.st === 'stadt' || a.st === 'later') && !a.est))
        out.push('Im Bauamt (Rathaus) Kostenschätzungen erbitten – damit hat ein Antrag im Stadtrat bessere Karten.');
      out.push('Mit den Leuten reden: „Hast du ein Anliegen?“');
    }
    return out;
  }
  // ======================= the start: Ingrid's letter =======================
  function begin(quiet) {
    if (ST.phase !== 'none' && ST.phase !== 'lost' && ST.phase !== 'missed') return;
    const again = ST.phase !== 'none';
    if (!again) ST = M.fresh(bonus());
    ST.phase = 'asked';
    ST.t0 = now();
    ST.letter = false;
    ST.sig = [];
    ST.extra = 0;
    ST.vote = null;
    ST.voted = false;
    ST.retry = null;
    if (again) ST.tries++;
    schedule(now());
    save();
    renderBook();
    BOOK.btn.querySelector('.dot').hidden = false;
    if (!quiet)
      toast(
        again
          ? 'Neuigkeit aus dem Dorf: Uwe Bachmann legt das Amt nieder – zu wenig Zeit neben dem Hof. Es gibt eine neue Nachwahl.'
          : 'Post für dich: ein Brief von Ingrid Hartung, der Ortsteilbürgermeisterin. (Knopf „Amt“ oder Taste O)',
        9000
      );
  }
  function letter() {
    ST.letter = true;
    if (ST.phase === 'asked' && avail('ingrid') && !TRK.k) track('ingrid');
    save();
    const again = ST.tries > 0;
    UI.open(
      again ? 'Neue Nachwahl' : 'Ein Brief von Ingrid',
      'Ratscher, ' + dateOf(ST.t0 ?? now()),
      again
        ? 'Uwe Bachmann hat das Amt niedergelegt – der Hof lässt ihm keine Zeit. Die Stadt setzt eine neue Nachwahl an. Diesmal fragt Ingrid nicht: Du kennst den Weg.'
        : D.T.letter,
      { id: 'letter', free: true }
    );
    UI.scene('<pre class="notice">' + esc(D.T.notice(dateOf(eStart() + 600), dateOf(ST.deadline))) + '</pre>');
    UI.buttons([
      ST.phase === 'asked' ? ['Ich stelle mich zur Wahl', () => stand('letter'), 'quest'] : null,
      ['So funktioniert das Amt', () => ((BOOK.tab = 'lernen'), UI.close(), toggleBook(true))],
      bye('Schließen'),
    ]);
  }
  // ======================= conversations =======================
  const today = () => dayOf(now());
  function met(k) {
    if (ST.met[k] !== today()) {
      if (ST.met[k] == null) L(k, 2, 'Du hast mit ' + nameOf(k) + ' über die Wahl gesprochen');
      else L(k, 1, 'Du hast dir wieder Zeit genommen');
      ST.met[k] = today();
    }
  }
  function stand(k) {
    if (ST.phase !== 'asked') return;
    if (now() > ST.deadline) {
      UI.say('Zu spät – die Frist für Wahlvorschläge ist abgelaufen.');
      return;
    }
    ST.phase = 'candidate';
    if (k && k !== 'letter') L(k, 4, 'Du hast dich zur Wahl gestellt');
    if (avail('ingrid')) L('ingrid', 4, 'Du trittst an – wie sie gehofft hat');
    save();
    UI.say(
      (k === 'uwe'
        ? 'Dann sehen wir uns am Wahlsonntag. Möge der Bessere gewinnen – und danach trinken wir ein Bier. Übrigens: '
        : k && k !== 'letter'
          ? 'Das ist schön! '
          : 'Gut. ') +
        'Du brauchst 20 Unterschriften von Wahlberechtigten aus Ratscher und reichst den Wahlvorschlag bis ' +
        dateOf(ST.deadline) +
        ', 18 Uhr, beim Wahlleiter im Rathaus Schleusingen ein.'
    );
    think('Aufgabe: 20 Unterstützungsunterschriften sammeln – frag die Leute im Dorf.');
    if (k && k !== 'letter' && !D.P[k].opp) UI.buttons([['Unterschreibst du?', () => sign(k), 'quest'], bye()]);
    else UI.buttons([bye('Schließen')]);
  }
  function sign(k) {
    const r = M.trySign(ST, k);
    save();
    if (r === 'no') UI.say(k === 'uwe' ? 'Für dich unterschreiben? Ich trete selbst an!' : D.T.sign.no);
    else UI.say(D.T.sign[r] + ' Jetzt ' + M.sigCount(ST) + ' von ' + D.SIGS + '.');
    if (r === 'yes' || r === 'more') {
      L(k, 1, 'Hat deinen Wahlvorschlag unterschrieben');
      if (M.sigCount(ST) >= D.SIGS)
        think('20 Unterschriften! Jetzt ab ins Rathaus nach Schleusingen – bis ' + dateOf(ST.deadline) + ', 18 Uhr.');
    }
    topics(UI.cur);
  }
  // issue questions: the person asks, the player answers (or keeps / changes the word given)
  function issueQ(k, i) {
    const I = D.ISSUES[i],
      p = ST.pos[i];
    UI.say(I.q);
    const opts = Object.entries(I.opts).map(([o, O]) => [
      p ? (p.o === o ? 'Wie gesagt: ' : 'Anders als gesagt: ') + O.say : O.say,
      () => answer(k, i, o),
      p && p.o === o ? 'quest' : '',
    ]);
    UI.buttons([...opts, ['Darüber muss ich noch nachdenken', () => topics(k)]]);
  }
  function answer(k, i, o) {
    const r = M.promise(ST, i, o, k, now()),
      I = D.ISSUES[i],
      O = I.opts[o];
    const eff = O.eff[k] || 0;
    let line =
      r === 'flip'
        ? 'Hm. Neulich hast du noch was anderes erzählt. So was spricht sich rum.'
        : eff > 3
          ? 'Das wollte ich hören.'
          : eff > 0
            ? 'Damit kann ich leben.'
            : eff < -3
              ? 'Das gefällt mir gar nicht.'
              : eff < 0
                ? 'Na ja. Mal sehen.'
                : 'Gut zu wissen.';
    if (O.learn) {
      line += ' – ' + O.learn;
      think(O.learn, 8000);
    }
    UI.say(line);
    save();
    UI.buttons([['Noch etwas', () => topics(k)], bye()]);
  }
  // the topics of a person in the panel, by the state of the matter
  function topics(k) {
    if (!k || !D.P[k]) return;
    const out = [];
    const p = D.P[k];
    if (ST.phase === 'asked') out.push([T_STAND(k), () => stand(k), 'quest']);
    if (campaign() && !p.opp) {
      if (ST.phase === 'candidate' && !ST.sig.includes(k))
        out.push(['Unterschreibst du meinen Wahlvorschlag?', () => sign(k), 'quest']);
      const q = p.ask.find(i => D.ISSUES[i].q && !(ST.pos[i] && ST.pos[i].told.includes(k)));
      if (q) out.push(['Was ist dir wichtig?', () => issueQ(k, q), 'quest']);
      for (const b of taskTopics(k)) out.push(b);
    }
    if (campaign() && p.opp)
      out.push([
        'Wie läuft dein Wahlkampf?',
        () =>
          UI.say(
            'Ich klingel nicht an jeder Tür, die Leute kennen mich. Feldwege, Ordnung, kein Geld für Firlefanz – das ist mein Programm. Und deins?'
          ),
      ]);
    if (office()) for (const b of officeTopics(k)) out.push(b);
    out.push(bye());
    UI.buttons(out);
  }
  const T_STAND = k =>
    k === 'uwe'
      ? 'Ich trete auch an.'
      : k === 'ingrid'
        ? 'Ja, ich stelle mich zur Wahl.'
        : 'Ich mach’s – ich kandidiere.';
  // open the panel for a person: how = 'dorf' | 'npc' | 'door'
  function talk(k, how) {
    if (!D.P[k]) return false;
    const intro = how === 'door' ? nameOf(k) + ' öffnet die Tür. ' : '';
    let text = '';
    if (ST.phase === 'asked') text = D.T.ask[k] || D.T.ask.gerhard;
    else if (office()) text = greetOffice(k);
    else if (campaign())
      text = D.P[k].opp
        ? 'Na, Konkurrenz? Keine Sorge, ich beiß nicht.'
        : ST.rep[k] >= 65
          ? 'Schön, dich zu sehen! Wie läuft der Wahlkampf?'
          : ST.rep[k] >= 45
            ? 'Ah, der Wahlkampf kommt an die Tür.'
            : 'Du schon wieder. Na gut, was gibt’s?';
    else if (ST.phase === 'lost' || ST.phase === 'missed')
      text = D.P[k].opp
        ? 'Na, Nachbar. Das Amt frisst mehr Zeit, als ich dachte.'
        : 'Schade um die Wahl. Vielleicht beim nächsten Mal.';
    else text = 'Hallo!';
    UI.open(fullOf(k), roleOf(k), intro + text, { who: k });
    if (campaign() || ST.phase === 'asked') met(k);
    topics(k);
    save();
    renderBook();
    return true;
  }
  function greetOffice(k) {
    const grumpy = ST.rep[k] < 35;
    const g = grumpy ? D.T.greetOfficeGrumpy : D.T.greetOffice;
    const line = g[(today() + k.length) % g.length];
    return female()
      ? line.replace('Herr Ortsvorsteher', 'Frau Ortsvorsteherin').replace(/Ortsvorsteher\b/g, 'Ortsvorsteherin')
      : line;
  }
  // ======================= campaign tasks =======================
  function taskTopics(k) {
    const out = [];
    const st = n => ST.tasks[n];
    if (k === 'gerhard' && st('chronik') !== 'done')
      out.push([
        'Für die Chronik',
        () => {
          UI.say(
            'Für die Chronik will ich festhalten, warum jemand Ortsvorsteher werden will. Übrigens: In der alten Schule war nach dem Kindergarten das Gemeindeamt – bis Ratscher 1994 zu Schleusingen kam. Also: Warum kandidierst du?'
          );
          UI.buttons(
            D.WHY.map(([a, eff, reply]) => [
              a,
              () => {
                ST.tasks.chronik = 'done';
                E(eff, 'Für die Chronik: „' + a + '“');
                UI.say(reply);
                save();
                UI.buttons([['Noch etwas', () => topics(k)], bye()]);
              },
            ])
          );
        },
        'quest',
      ]);
    if (k === 'ingrid' && st('amt') !== 'done') out.push(['Was kann so ein Ortsvorsteher?', () => quiz(0, 0), 'quest']);
    if (k === 'manfred' && st('hydrant') == null)
      out.push([
        'Kann ich der Feuerwehr helfen?',
        () => {
          ST.tasks.hydrant = 0;
          save();
          UI.say(
            'Gut, dass du fragst. Der Unterflurhydrant am Anger ist unter Laub verschwunden. Am Zaun hängt das rot umrandete Schild: oben H 80, darunter 1,5 und 4,0. Heißt: Leitung 80 Millimeter, der Deckel liegt anderthalb Meter seitlich und vier Meter vor dem Schild. Mach ihn frei – im Ernstfall zählt jede Minute.'
          );
          AMTWORLD.hydrant(true);
          track('hydrant');
          think('Aufgabe: Den Hydrantendeckel am Anger nach dem Schild finden und freimachen.');
          UI.buttons([bye()]);
        },
        'quest',
      ]);
    if (k === 'manfred' && st('hydrant') === 1)
      out.push([
        'Der Hydrant ist frei',
        () => {
          ST.tasks.hydrant = 'done';
          E(D.TASKS.hydrant.gain, 'Du hast den Hydranten am Anger freigemacht');
          UI.say(
            'Sauber! Und jetzt weißt du, wie man das Schild liest. Das erzähl ich am Freitag – so einen Ortsvorsteher können wir brauchen.'
          );
          save();
          UI.buttons([['Noch etwas', () => topics(k)], bye()]);
        },
        'quest',
      ]);
    if (k === 'katrin' && st('bus') == null)
      out.push([
        'Was bewegt dich?',
        () => {
          ST.tasks.bus = 0;
          track('bus');
          save();
          UI.say(
            'Komm mal an einem Schultag früh an die Bushaltestelle, zwischen Viertel vor sieben und halb acht. Dann siehst du selbst, wie die Kinder im Dunkeln an der Straße stehen und die Pendler vorbeirauschen.'
          );
          think('Aufgabe: An einem Schultag zwischen 6:45 und 7:30 Uhr an der Bushaltestelle sein.');
          UI.buttons([bye()]);
        },
        'quest',
      ]);
    if (k === 'katrin' && st('bus') === 1)
      out.push([
        'Ich war früh an der Haltestelle',
        () => {
          ST.tasks.bus = 'done';
          E(D.TASKS.bus.gain, 'Du warst morgens an der Bushaltestelle');
          UI.say(
            'Du warst wirklich da? Das hat noch keiner gemacht, der gewählt werden wollte. Und – was sagst du zu Tempo 30?'
          );
          save();
          UI.buttons([['Tempo 30 …', () => issueQ(k, 'tempo30'), 'quest'], bye()]);
        },
        'quest',
      ]);
    if ((k === 'heike' || k === 'ronald') && avail('heike') && avail('ronald') && st('zaun') !== 'done')
      out.push([st('zaun') === 1 ? 'Der Zaun ist geflickt' : 'Die Ziegen und die Bohnen', () => zaun(k), 'quest']);
    if (k === 'hubert' && st('briefwahl') !== 'done')
      out.push([
        st('briefwahl') === 2
          ? 'Hier sind Ihre Briefwahlunterlagen'
          : st('briefwahl') === 1
            ? 'Die Briefwahl …'
            : 'Gehen Sie am Sonntag wählen?',
        () => briefwahl(),
        'quest',
      ]);
    return out;
  }
  function quiz(i, right) {
    if (i >= D.QUIZ.length) {
      ST.tasks.amt = 'done';
      if (right >= 2) {
        L('ingrid', 8, 'Du weißt, was das Amt kann');
        for (const k of D.KEYS)
          if (!D.P[k].opp && k !== 'ingrid' && avail(k)) L(k, 3, 'Ingrid erzählt im Dorf, dass du dich auskennst');
      } else L('ingrid', 2, 'Du hast zugehört');
      save();
      UI.say(
        right >= 2
          ? 'Du hast es verstanden. Ich sag den Leuten, dass ich dich wählen würde – das darf ich, auch wenn ich noch im Amt bin.'
          : 'Lies es nach – in der Mappe steht’s. Ein Ortsvorsteher muss wissen, was er kann und was nicht.'
      );
      UI.buttons([bye()]);
      return;
    }
    const [q, as, ok, ex] = D.QUIZ[i];
    UI.say(q);
    UI.buttons(
      as.map((a, j) => [
        a,
        () => {
          UI.say((j === ok ? 'Richtig. ' : 'Nicht ganz. ') + ex);
          UI.buttons([['Weiter', () => quiz(i + 1, right + (j === ok ? 1 : 0)), 'quest']]);
        },
      ])
    );
  }
  function zaun(k) {
    const s = ST.tasks.zaun;
    if (s === 1) {
      ST.tasks.zaun = 'done';
      M.promise(ST, 'ziegen', 'mitte', k, now());
      save();
      UI.say(
        k === 'heike'
          ? 'Ihr habt den Zaun zusammen geflickt? Und Ronald bringt mir Mist für die Beete? Dann ist’s gut. So macht man das im Dorf.'
          : 'Hält wieder, der Zaun. Und Heike kriegt ihren Mist. Danke dir – allein hätt ich mich nicht getraut, zu ihr zu gehen.'
      );
      UI.buttons([bye()]);
      return;
    }
    UI.say(
      k === 'heike'
        ? 'Ronalds Ziegen waren in meinen Bohnen! Die halbe Reihe ist weg. Kann man da als Ortsvorsteher nicht was machen?'
        : 'Die Heike ist sauer, weil die Ziegen in ihren Bohnen waren. Der Zaun hinten ist morsch. Was soll ich machen?'
    );
    UI.buttons([
      [
        D.ISSUES.ziegen.opts.heike.say,
        () => {
          ST.tasks.zaun = 'done';
          M.promise(ST, 'ziegen', 'heike', k, now());
          save();
          UI.say(k === 'heike' ? 'Genau so sehe ich das!' : 'Na danke. Das merk ich mir.');
          UI.buttons([bye()]);
        },
      ],
      [
        D.ISSUES.ziegen.opts.ronald.say,
        () => {
          ST.tasks.zaun = 'done';
          M.promise(ST, 'ziegen', 'ronald', k, now());
          save();
          UI.say(k === 'ronald' ? 'Siehst du, du verstehst das.' : 'Ein paar Bohnen? Das war meine Ernte!');
          UI.buttons([bye()]);
        },
      ],
      [
        'Ich helfe Ronald, den Zaun zu flicken.',
        () => {
          ST.tasks.zaun = 0;
          save();
          AMTWORLD.fence(true);
          track('fence');
          UI.say(
            k === 'heike'
              ? 'Wenn das hält, bin ich zufrieden. Ronald hat hinten an der Weide ein Stück Zaun liegen.'
              : 'Das wär was! Das morsche Stück ist hinten an der Westseite, beim Gatter.'
          );
          think('Aufgabe: Den Zaun an Ronalds Weide (Westseite, beim Gatter) flicken.');
          UI.buttons([bye()]);
        },
        'quest',
      ],
    ]);
  }
  function briefwahl() {
    const s = ST.tasks.briefwahl;
    if (s === 1 || s === 2) {
      if (s === 1) {
        UI.say('Die Unterlagen? Die müssen Sie erst im Rathaus abholen. Die Vollmacht haben Sie ja.');
        UI.buttons([bye()]);
        return;
      }
      ST.tasks.briefwahl = 'done';
      E(D.TASKS.briefwahl.gain, 'Du hast Hubert die Briefwahl möglich gemacht');
      save();
      UI.say(
        'Wahlschein, Stimmzettel, zwei Umschläge. Ankreuzen, den Stimmzettel in den kleinen Umschlag, mit dem unterschriebenen Wahlschein in den großen, ab in den Briefkasten – rechtzeitig, er muss am Wahlsonntag da sein. Und wen ich ankreuze, geht Sie nichts an. (Er grinst.)'
      );
      UI.buttons([bye()]);
      return;
    }
    if (ST.rep.hubert < 40) {
      UI.say('Wählen? Bringt doch nix. Die in Schleusingen machen eh, was sie wollen.');
      L('hubert', 1, 'Du hast es versucht');
      UI.buttons([bye()]);
      return;
    }
    UI.say(
      'Sonntag bin ich bei meiner Schwester in Suhl, Geburtstag. Da wird das nix mit Wählen. – Briefwahl? Da muss man doch ins Rathaus …'
    );
    UI.buttons([
      [
        'Ich hole Ihnen die Unterlagen – mit Ihrer Vollmacht.',
        () => {
          ST.tasks.briefwahl = 1;
          save();
          UI.say(
            'Hinten auf der Wahlbenachrichtigung ist der Antrag. Hier, unterschrieben – und das da ist die Vollmacht. Ohne die gibt man Ihnen nichts raus.'
          );
          think(
            'Aufgabe: Im Rathaus Schleusingen Huberts Briefwahlunterlagen abholen (mit Vollmacht) und ihm bringen.'
          );
          UI.buttons([bye()]);
        },
        'quest',
      ],
      bye('Dann eben nicht'),
    ]);
  }
  // introducing oneself at the Friday evening (inside the school, once per campaign)
  function speech() {
    UI.open(
      'Skatabend in der alten Schule',
      'Wahlkampf am Freitag',
      (avail('ingrid') ? 'Ingrid ruft durch den Raum: ' : '') +
        '„Wir haben einen Kandidaten unter uns! Sag doch ein paar Worte.“ Alle schauen dich an. Was sagst du?',
      { id: 'speech' }
    );
    UI.buttons([
      ...D.SPEECH.map(([label, eff]) => [
        label,
        () => {
          ST.tasks.vorstellen = 'done';
          for (const k of D.KEYS) if (!D.P[k].npc && avail(k)) L(k, 2, 'Du hast dich beim Skatabend vorgestellt');
          E(eff, 'Deine Rede: ' + label);
          save();
          UI.say(
            'Beifall, ein paar Pfiffe, Manfred klopft auf den Tisch. Gerhard schreibt etwas in sein Heft. Uwe hebt das Glas: „Auf eine faire Wahl!“'
          );
          UI.buttons([bye()]);
        },
        'quest',
      ]),
      bye('Lieber ein andermal'),
    ]);
  }
  // ======================= the town hall in Schleusingen (a scene until the walkable town has one) =======================
  const canTrip = () => campaign() || office();
  function trip() {
    if (!canTrip()) return;
    UI.close();
    if (P.mode !== 'walk') return;
    CLOCK.wait(25, 'Fahrt nach Schleusingen', () => rathaus());
  }
  function rathaus() {
    const t = now();
    const items = [];
    UI.open(
      'Rathaus Schleusingen',
      'am Markt · ' + dateOf(t) + ', ' + CLOCK.hm(t) + ' Uhr',
      'Das Rathaus am Markt, unten das Bürgerbüro, oben der Sitzungssaal. Wohin?',
      { id: 'rathaus', free: true, wide: true, scene: SCENES.rathaus() }
    );
    if (ST.phase === 'candidate')
      items.push([
        'Wahlamt: Wahlvorschlag einreichen',
        () => {
          if (t > ST.deadline) {
            UI.say('„Die Frist ist abgelaufen – am ' + dateOf(ST.deadline) + ' um 18 Uhr. Tut mir leid.“');
            return;
          }
          const n = M.sigCount(ST);
          if (n < D.SIGS) {
            UI.say(
              '„Ihr Wahlvorschlag braucht 20 Unterstützungsunterschriften von Wahlberechtigten aus Ratscher – fünfmal so viele, wie der Ortsteilrat Mitglieder hat. Ich zähle ' +
                n +
                '. Es fehlen ' +
                (D.SIGS - n) +
                '.“'
            );
            return;
          }
          ST.phase = 'nominated';
          save();
          UI.say(
            '„Name, Geburtsdatum, Anschrift, Beruf – alles da. 20 gültige Unterschriften. Der Wahlausschuss lässt Ihren Wahlvorschlag zu; er kommt auf den Stimmzettel, neben Uwe Bachmann. Viel Glück!“'
          );
          think('Du stehst auf dem Stimmzettel. Jetzt heißt es: Wahlkampf – mit den Leuten reden.');
          rathausButtons();
        },
        'quest',
      ]);
    if (campaign() && ST.tasks.briefwahl === 1)
      items.push([
        'Wahlamt: Briefwahlunterlagen für Hubert abholen',
        () => {
          ST.tasks.briefwahl = 2;
          save();
          UI.say(
            '„Mit Vollmacht? Zeigen Sie mal … unterschrieben, gut. Wer für jemand anderen abholt, braucht immer eine schriftliche Vollmacht. Hier: Wahlschein, Stimmzettel, Umschläge.“'
          );
          rathausButtons();
        },
        'quest',
      ]);
    if (office()) {
      if (thursday(t)) items.push(['Sitzungssaal: Stadtratssitzung', () => council(), 'quest']);
      const need = Object.entries(ST.anl).filter(
        ([id, a]) => (a.st === 'stadt' || a.st === 'later') && !a.est && D.ANLIEGEN[id].by !== 'ortsteil'
      );
      for (const [id] of need)
        items.push([
          'Bauamt: Kostenschätzung „' + D.ANLIEGEN[id].title + '“',
          () => {
            ST.anl[id].est = 1;
            ST.council = Math.min(100, ST.council + 4);
            save();
            UI.say(
              '„' +
                D.ANLIEGEN[id].title +
                '? Wir schauen uns das vor Ort an und schätzen die Kosten: rund ' +
                D.ANLIEGEN[id].cost.toLocaleString('de-DE') +
                ' Euro. Mit der Schätzung hat Ihr Antrag im Stadtrat bessere Karten.“'
            );
            rathausButtons();
          },
        ]);
    }
    RATH.items = items;
    rathausButtons();
  }
  const RATH = { items: [] };
  function rathausButtons() {
    UI.buttons([
      ...RATH.items.filter(Boolean),
      [
        'Zurück nach Ratscher',
        () => {
          UI.close();
          CLOCK.wait(25, 'Zurück nach Ratscher');
        },
        'bye',
      ],
    ]);
  }
  // ======================= election day: voting, the public count, the result =======================
  function vote() {
    UI.open('Wahlraum in der alten Schule', 'Nachwahl des Ortsteilbürgermeisters · ' + dateOf(now()), '', {
      id: 'vote',
      scene: SCENES.ballot(),
    });
    if (ST.voted) {
      UI.say('Du hast schon gewählt. Jeder hat eine Stimme – auch die Kandidaten.');
      UI.buttons([bye()]);
      return;
    }
    UI.say(
      (avail('gerhard') ? 'Gerhard sitzt als Wahlvorsteher am Tisch: ' : 'Der Wahlvorsteher: ') +
        '„Wahlbenachrichtigung und Ausweis, bitte. – Danke. Hier ist Ihr Stimmzettel. In der Kabine ein Kreuz, falten, in die Urne.“'
    );
    UI.buttons([
      [
        'Kreuz bei dir selbst',
        () => {
          ST.voted = true;
          save();
          UI.say('Du faltest den Zettel und wirfst ihn ein. Ja – man darf sich selbst wählen.');
          UI.buttons([bye()]);
        },
        'quest',
      ],
      [
        'Kreuz bei Uwe Bachmann',
        () => {
          ST.voted = 'opp';
          L('uwe', 3, 'Fair: Du hast ihn gewählt (er weiß es nicht, aber er ahnt es)');
          save();
          UI.say('Du faltest den Zettel und wirfst ihn ein. Was du angekreuzt hast, weiß nur du.');
          UI.buttons([bye()]);
        },
      ],
    ]);
  }
  // the count, ballot by ballot (in the frame loop's time: tests step the world), then the result and the acceptance
  const CNT = { on: false, i: 0, t: 0, res: null, me: 0, opp: 0, inv: 0, fast: false };
  function count(fast) {
    if (ST.vote && ST.vote.counted) return result();
    const seed = (ST.eday || 1) * 7919 + ST.tries * 31 + 17;
    const res = M.simulate(Object.assign({}, ST, { voted: ST.voted === true }), seed, avail);
    if (ST.voted === 'opp') {
      res.ballots.push('opp');
      res.opp++;
      res.turnout++;
    }
    Object.assign(CNT, { on: true, i: 0, t: 0, res, me: 0, opp: 0, inv: 0, fast: !!fast });
    UI.open('Öffentliche Auszählung', 'alte Schule Ratscher · 18 Uhr', '', {
      id: 'count',
      wide: true,
      scene: SCENES.tally(CNT),
    });
    UI.say(
      'Die Urne wird geöffnet. Der Wahlvorstand zählt laut – jeder darf zuschauen, das gehört zur Demokratie: Stapel für Uwe Bachmann, Stapel für dich, ungültige extra.'
    );
    UI.buttons([['Schneller', () => (CNT.fast = true)]]);
    if (fast) countTick(1e9);
  }
  function countTick(dt) {
    if (!CNT.on) return;
    CNT.t += dt;
    const step = CNT.fast ? 0.02 : 0.35;
    let changed = false;
    while (CNT.t >= step && CNT.i < CNT.res.ballots.length) {
      CNT.t -= step;
      const b = CNT.res.ballots[CNT.i++];
      if (b === 'me') CNT.me++;
      else if (b === 'opp') CNT.opp++;
      else CNT.inv++;
      changed = true;
    }
    if (changed && UI.cur === 'count') UI.scene(SCENES.tally(CNT));
    if (CNT.i >= CNT.res.ballots.length) {
      CNT.on = false;
      const r = CNT.res;
      ST.vote = {
        me: r.me,
        opp: r.opp,
        inv: r.inv,
        eligible: r.eligible,
        turnout: r.turnout,
        won: r.won,
        tie: r.tie,
        counted: true,
        accepted: false,
        seed: r.seed,
      };
      save();
      if (UI.cur === 'count') result();
    }
  }
  function result() {
    const v = ST.vote;
    if (!v) return;
    const valid = v.me + v.opp;
    const txt =
      'Wahlberechtigte: ' +
      v.eligible +
      ' · Wähler: ' +
      v.turnout +
      ' (' +
      Math.round((100 * v.turnout) / Math.max(1, v.eligible)) +
      ' %) · ungültig: ' +
      v.inv +
      ' · gültig: ' +
      valid +
      '. Du: ' +
      v.me +
      ' Stimmen (' +
      Math.round((100 * v.me) / Math.max(1, valid)) +
      ' %), Uwe Bachmann: ' +
      v.opp +
      ' (' +
      Math.round((100 * v.opp) / Math.max(1, valid)) +
      ' %). ';
    if (UI.cur !== 'count')
      UI.open('Das Ergebnis', 'Nachwahl in Ratscher', '', {
        id: 'count',
        wide: true,
        scene: SCENES.tally(Object.assign({}, CNT, v)),
      });
    if (v.won) {
      UI.say(
        txt +
          (v.tie
            ? 'Gleichstand! Eigentlich gäbe es jetzt eine Stichwahl – hier entscheidet das Los (vereinfacht): Es fällt auf dich. '
            : 'Mehr als die Hälfte der gültigen Stimmen: ') +
          'Du bist gewählt. Der Wahlleiter fragt: „Nehmen Sie die Wahl an?“'
      );
      UI.buttons([['Ja, ich nehme die Wahl an.', () => accept(), 'quest']]);
    } else {
      UI.say(
        txt +
          'Uwe Bachmann hat mehr als die Hälfte der gültigen Stimmen. Er nimmt die Wahl an. Du gehst zu ihm und gratulierst – im Dorf sieht man sich wieder.'
      );
      if (ST.phase === 'nominated') {
        ST.phase = 'lost';
        ST.retry = (ST.eday + 12) * 1440 + 9 * 60;
        L('uwe', 4, 'Du hast fair verloren und gratuliert');
        save();
      }
      UI.buttons([bye('Schade')]);
    }
    renderBook();
  }
  function accept() {
    if (ST.phase !== 'nominated' || !ST.vote || !ST.vote.won) return;
    ST.vote.accepted = true;
    ST.phase = 'office';
    ST.since = now();
    ST.byear = yearOf(now());
    ST.budget = D.BUDGET;
    for (const k of D.KEYS) if (!D.P[k].opp) L(k, 3, 'Du bist ' + TITLE() + ' – man freut sich (meistens)');
    L('uwe', 2, 'Er nimmt es sportlich');
    // the first concerns come at once
    for (const id of ['laterne', 'kirmes']) if (!ST.anl[id]) ST.anl[id] = { st: 'open', t: now(), why: '', d: '' };
    save();
    UI.say(
      'Beifall. Ingrid umarmt dich und drückt dir eine dicke Mappe in die Hand: „Die Anliegen. Und der Schlüssel fürs Gemeindebüro – das ist das kleine Zimmer hinten in der Schule.“ Uwe schüttelt dir die Hand: „Glückwunsch. Ich bleib im Ortsteilrat – wir kriegen das hin.“ Gerhard schreibt: „' +
        dateOf(now()) +
        ': neuer ' +
        TITLE() +
        ' gewählt.“ Vereidigt wirst du in der nächsten Sitzung des Stadtrats in Schleusingen – donnerstags.'
    );
    think('Du bist ' + TITLE() + ' von Ratscher! Die Mappe (O) enthält die ersten Anliegen.', 8000);
    UI.buttons([bye('Danke!')]);
    AMTWORLD.refresh(ST, now());
    renderBook();
  }
  const yearOf = t => new Date((DCAL.eday(t) || 0) * 864e5).getUTCFullYear();
  // ======================= the office: concerns, the Ortsteilrat, the town council =======================
  function officeTopics(k) {
    const out = [];
    const mine = Object.entries(D.ANLIEGEN).filter(([id, A]) => A.from === k);
    const fresh = mine.find(([id]) => !ST.anl[id]);
    if (fresh)
      out.push([
        'Hast du ein Anliegen?',
        () => {
          const [id, A] = fresh;
          ST.anl[id] = { st: 'open', t: now(), why: '', d: '' };
          L(k, 3, 'Du hast nach ihrem Anliegen gefragt');
          save();
          UI.say(A.ask + (A.by === 'privat' ? '' : ' – Ich nehme es mit in den Ortsteilrat.'));
          UI.buttons([['Noch etwas', () => topics(k)], bye()]);
        },
        'quest',
      ]);
    else if (!mine.length || mine.every(([id]) => ST.anl[id]))
      out.push([
        'Wie geht’s, was gibt’s Neues?',
        () => {
          if (ST.met[k] !== today()) {
            ST.met[k] = today();
            L(k, 1, 'Der ' + TITLE() + ' hört zu');
            save();
          }
          UI.say(
            [
              'Alles ruhig. Aber gut, dass du fragst – Ingrid hat das auch immer gemacht.',
              'Nichts Neues. Doch: Die Linde treibt dieses Jahr früh.',
              'Man hört, du machst das ordentlich.',
            ][(today() + k.length) % 3]
          );
        },
      ]);
    for (const [id] of mine)
      if (ST.anl[id] && ST.anl[id].st !== 'open')
        out.push([
          'Wie steht’s um „' + D.ANLIEGEN[id].title + '“?',
          () => UI.say(ASTXT[ST.anl[id].st] + (ST.anl[id].why ? ': ' + ST.anl[id].why : '.')),
        ]);
    return out;
  }
  // the Ortsteilrat session in the old school (any evening 17–22 h, called by the Ortsvorsteher)
  const RAT = { items: [], i: 0 };
  function ortsrat() {
    if (yearOf(now()) !== ST.byear) {
      ST.byear = yearOf(now());
      ST.budget = D.BUDGET;
    }
    RAT.items = Object.keys(ST.anl).filter(id => ST.anl[id].st === 'open');
    RAT.i = 0;
    UI.open(
      'Sitzung des Ortsteilrats',
      'alte Schule · öffentlich · ' + dateOf(now()),
      'Du eröffnest die Sitzung: Der Ortsteilrat ist beschlussfähig – ' +
        D.ORTSRAT.filter(avail).map(nameOf).join(', ') +
        ' sind da, dazu drei Zuhörer. ' +
        (RAT.items.length
          ? RAT.items.length + ' Punkte auf der Tagesordnung.'
          : 'Keine Anliegen auf der Tagesordnung.'),
      { id: 'ortsrat', wide: true, scene: SCENES.room('ortsrat') }
    );
    UI.buttons(RAT.items.length ? [['Erster Punkt', () => ratItem(), 'quest']] : [bye('Sitzung schließen')]);
  }
  function ratItem() {
    if (RAT.i >= RAT.items.length) {
      UI.say(
        'Die Tagesordnung ist abgearbeitet. Du schließt die Sitzung. Gerhard: „Protokoll schreibe ich bis Sonntag.“'
      );
      UI.buttons([bye('Sitzung schließen')]);
      save();
      renderBook();
      return;
    }
    const id = RAT.items[RAT.i],
      A = D.ANLIEGEN[id];
    const lean = D.LEAN[id] || {};
    const voices = D.ORTSRAT.filter(avail)
      .map(k => {
        const l = lean[k] || 0;
        return (
          nameOf(k) +
          ': „' +
          (l >= 2
            ? 'Unbedingt, darauf warten die Leute.'
            : l > 0
              ? 'Bin dafür.'
              : l < -1
                ? 'Ich halte nichts davon.'
                : l < 0
                  ? 'Muss das sein?'
                  : 'Kommt drauf an, was es kostet.') +
          '“'
        );
      })
      .join(' ');
    const who = {
      ortsteil:
        'Darüber entscheidet der Ortsteilrat selbst – Kosten etwa ' +
        A.cost +
        ' Euro, übrig sind ' +
        Math.round(ST.budget) +
        ' Euro.',
      stadt:
        'Das entscheidet der Stadtrat; der Ortsteilrat kann es vorschlagen (Kosten etwa ' +
        A.cost.toLocaleString('de-DE') +
        ' Euro).',
      kreis: 'Anordnen kann das nur das Landratsamt; der Ortsteilrat kann der Stadt vorschlagen, es zu beantragen.',
      privat: 'Das ist keine Sache des Rats.',
    }[A.by];
    UI.say('Punkt ' + (RAT.i + 1) + ': ' + A.title + ' (Anliegen von ' + nameOf(A.from) + '). ' + who + ' ' + voices);
    if (A.by === 'privat') {
      UI.buttons([
        [
          'Erklären: Streit unter Nachbarn klärt man miteinander',
          () => {
            ST.anl[id] = { st: 'privat', t: now(), why: M.council(ST, id, {}).why, d: '' };
            UI.say(
              'Du erklärst: Der Rat kann Ronald keinen Zaun vorschreiben. Aber du redest mit beiden. Heike nickt zögernd. (Hilfe: in der Mappe, „So geht’s“.)'
            );
            RAT.i++;
            UI.buttons([['Nächster Punkt', () => ratItem(), 'quest']]);
          },
          'quest',
        ],
      ]);
      return;
    }
    UI.buttons([
      ['Ich stimme dafür', () => ratVote(id, true), 'quest'],
      ['Ich stimme dagegen', () => ratVote(id, false)],
    ]);
  }
  function ratVote(id, yes) {
    const A = D.ANLIEGEN[id];
    const r = M.ortsrat(ST, id, yes);
    const tally = r.votes.map(([k, v]) => (k === 'chair' ? 'du' : nameOf(k)) + (v ? ' ja' : ' nein')).join(', ');
    let res, why;
    // a promise on the matter's issue: voting against what one promised breaks it
    const pr = A.issue && ST.pos[A.issue];
    if (pr && (pr.o === 'nein') === yes && pr.o !== 'mitte')
      for (const k of pr.told) L(k, -6, 'Versprechen gebrochen: ' + A.title);
    if (!r.pass) {
      res = 'no';
      why =
        'Der Ortsteilrat hat abgelehnt (' +
        r.yes +
        ' zu ' +
        r.no +
        (r.yes === r.no ? ' – bei Stimmengleichheit ist ein Antrag abgelehnt' : '') +
        ').';
      for (const [k, d] of Object.entries(A.fans)) L(k, -Math.ceil(d / 2), 'Abgelehnt im Ortsteilrat: ' + A.title);
    } else if (A.by === 'ortsteil') {
      if (ST.budget >= A.cost) {
        ST.budget -= A.cost;
        res = 'yes';
        why =
          'Beschlossen mit ' +
          r.yes +
          ' zu ' +
          r.no +
          ' Stimmen – bezahlt aus dem Geld des Ortsteils (' +
          A.cost +
          ' Euro).';
        ST.built[A.build] = now() + A.days * 1440;
        E(A.fans, 'Beschlossen: ' + A.title);
        E(A.foes, 'Beschlossen: ' + A.title);
        keep(A, 'Versprechen gehalten: ' + A.title);
      } else {
        res = 'later';
        why =
          'Dafür ist? Ja – aber das Geld des Ortsteils reicht dieses Jahr nicht mehr (' +
          Math.round(ST.budget) +
          ' Euro übrig). Nächstes Jahr wieder.';
      }
    } else {
      res = 'stadt';
      why =
        'Der Ortsteilrat empfiehlt es der Stadt (' +
        r.yes +
        ' zu ' +
        r.no +
        '). Du trägst es im Stadtrat vor – die Stadt muss es binnen drei Monaten behandeln.';
    }
    ST.anl[id] = Object.assign(ST.anl[id] || {}, { st: res, t: now(), why, d: res, una: r.unanimous ? 1 : 0 });
    save();
    UI.say('Abstimmung: ' + tally + '. ' + why);
    RAT.i++;
    UI.buttons([['Nächster Punkt', () => ratItem(), 'quest']]);
    AMTWORLD.refresh(ST, now());
  }
  function keep(A, why) {
    const pr = A.issue && ST.pos[A.issue];
    if (pr && pr.o !== 'nein') for (const k of pr.told) L(k, 3, why);
  }
  // the town council in Schleusingen (Thursdays): swearing in, then the motions of the Ortsteilrat
  const CNC = { items: [], i: 0 };
  function council() {
    CNC.items = Object.keys(ST.anl).filter(
      id => ST.anl[id].st === 'stadt' || (ST.anl[id].st === 'later' && ST.anl[id].est)
    );
    CNC.i = 0;
    UI.open('Stadtratssitzung', 'Sitzungssaal im Rathaus Schleusingen · öffentlich', '', {
      id: 'council',
      free: true,
      wide: true,
      scene: SCENES.room('stadtrat'),
    });
    if (!ST.sworn) {
      UI.say(
        'Der Bürgermeister bittet dich nach vorn: „Als Ortsteilbürgermeister sind Sie Ehrenbeamter der Stadt. Sprechen Sie mir nach: Ich schwöre, dass ich das Grundgesetz für die Bundesrepublik Deutschland und die Verfassung des Freistaats Thüringen sowie die Gesetze wahren und meine Amtspflichten gewissenhaft erfüllen werde.“ Du sprichst nach. Er überreicht dir die Ernennungsurkunde. Beifall von allen Bänken.'
      );
      ST.sworn = true;
      ST.council = Math.max(ST.council, 30);
      save();
      UI.buttons([[CNC.items.length ? 'Zur Tagesordnung' : 'Weiter', () => cncItem(), 'quest']]);
      return;
    }
    cncItem();
  }
  function cncItem() {
    if (CNC.i >= CNC.items.length) {
      UI.say(
        CNC.items.length
          ? 'Die Punkte aus Ratscher sind durch. Du darfst im Stadtrat mitreden und Anträge stellen – abstimmen dürfen nur die gewählten Stadträte.'
          : 'Heute steht nichts aus Ratscher auf der Tagesordnung. Du hörst zu: Haushalt, Kita-Gebühren, ein Radweg. Als Ortsteilbürgermeister darfst du bei allem mitreden, was Ratscher betrifft.'
      );
      UI.buttons([
        [
          'Zurück nach Ratscher',
          () => {
            UI.close();
            CLOCK.wait(30, 'Zurück nach Ratscher');
          },
          'bye',
        ],
      ]);
      save();
      renderBook();
      return;
    }
    const id = CNC.items[CNC.i],
      A = D.ANLIEGEN[id],
      a = ST.anl[id];
    UI.say(
      'Tagesordnungspunkt: Antrag des Ortsteilrats Ratscher – ' +
        A.title +
        '. Du hast das Wort.' +
        (a.est
          ? ' Die Kostenschätzung des Bauamts liegt vor.'
          : ' (Ohne Kostenschätzung des Bauamts – die kannst du im Rathaus erbitten.)')
    );
    UI.buttons([
      [
        'Vortragen: was die Leute in Ratscher brauchen',
        () => {
          const pos = A.issue && ST.pos[A.issue] ? ST.pos[A.issue].o : null;
          const res = M.council(ST, id, {
            rat: { pass: true, unanimous: !!a.una },
            prepared: !!a.est,
            budget: cityBudget(),
            pos,
          });
          let st = res.d;
          if (st === 'yes' || st === 'kreis') {
            CITY.spent += A.cost;
            ST.built[A.build] = now() + A.days * 1440;
            E(A.fans, (st === 'kreis' ? 'Angegangen: ' : 'Beschlossen: ') + A.title);
            E(A.foes, 'Beschlossen: ' + A.title);
            keep(A, 'Versprechen gehalten: ' + A.title);
            ST.council = Math.min(100, ST.council + 6);
          } else if (st === 'no') {
            for (const [k, d] of Object.entries(A.fans))
              L(k, -Math.ceil(d / 3), 'Abgelehnt in Schleusingen: ' + A.title);
          } else if (id === 'feldweg')
            for (const [k] of Object.entries(A.fans)) L(k, 1, 'Wenigstens Schotter in die Löcher');
          ST.anl[id] = Object.assign(a, { st, t: now(), why: res.why, d: st });
          save();
          UI.say(
            'Du trägst vor, ein paar Fragen, dann stimmen die Stadträte ab. ' +
              res.why +
              (st === 'later' && !a.est ? '' : '')
          );
          CNC.i++;
          UI.buttons([['Weiter', () => cncItem(), 'quest']]);
          AMTWORLD.refresh(ST, now());
        },
        'quest',
      ],
    ]);
  }
  // the town's money for small matters this year (simplified: 12 000 euros a year for all its villages' small projects)
  const CITY = { spent: 0 };
  const cityBudget = () => 12000 - CITY.spent;
  // ======================= the panels of the villagers and the neighbours: one button more =======================
  function injectLabel(k) {
    if (!D.P[k] || ST.phase === 'none') return null;
    if (ST.phase === 'asked') return 'Die Nachwahl …';
    if (campaign()) return D.P[k].opp ? 'Die Wahl' : 'Über die Wahl reden';
    if (office()) return 'Als ' + TITLE() + ' …';
    return null;
  }
  function inject(box, k, close) {
    if (!box) return;
    const old = box.querySelector('[data-amt]');
    const label = DORF.game && DORF.game.on && box !== $('np-topics') ? null : injectLabel(k); // not in the middle of Katrin's card game
    if (!label) {
      if (old) old.remove();
      return;
    }
    if (old && old.dataset.amt === k + label) return;
    if (old) old.remove();
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quest';
    b.dataset.amt = k + label;
    b.textContent = label;
    b.addEventListener('click', () => {
      close();
      talk(k, 'panel');
    });
    const by = box.querySelector('.bye');
    box.insertBefore(b, by || null);
  }
  function watchPanels() {
    const dp = DORF && DORF.UI && DORF.UI.el,
      dt = dp && dp.querySelector('.topics');
    if (dt && window.MutationObserver)
      new MutationObserver(() => {
        if (!DORF.UI.cur || dp.hidden) return;
        inject(dt, DORF.UI.cur, () => DORF.UI.close());
        if (office() && DORF.UI.cur + today() !== LASTGREET.k && D.P[DORF.UI.cur]) {
          LASTGREET.k = DORF.UI.cur + today();
          DORF.UI.say(DORF.UI.cur, greetOffice(DORF.UI.cur));
        }
      }).observe(dt, { childList: true });
    const nt = $('np-topics');
    if (nt && window.MutationObserver)
      new MutationObserver(() => {
        const w = NPCUI.cur();
        if (w) inject(nt, w.name, () => NPCUI.end(false));
      }).observe(nt, { childList: true });
  }
  const LASTGREET = { k: null };
  // ======================= the one who opens the door: a figure of its own in the doorway =======================
  // The villagers' figures (dorf/dorf_people.js) belong to the village life, which loads and drops them for its evenings and gardens; the
  // one at the door is loaded here (the same files), stands in the doorway while one talks and goes when the panel closes.
  const DF = { f: null, k: null, tok: 0, clips: {} };
  async function doorFig(k) {
    const p = DTEXT.P && DTEXT.P[k],
      CH = window.CHARMAN || {},
      PM = window.PLAYERMAN || {},
      H = homes(),
      h = H && H[k];
    if (!p || !h || !CH[p.fig] || !PM.pclips_m || QS.get('lowfig')) return;
    doorFigDrop();
    const tok = ++DF.tok;
    try {
      const cf = p.clips === 'f' && PM.pclips_f ? PM.pclips_f : PM.pclips_m;
      let set = (DPEOPLE.clips && DPEOPLE.clips[p.clips]) || DF.clips[cf];
      if (!set) {
        const FL = new THREE.FileLoader();
        FL.setResponseType('json');
        set = DF.clips[cf] = await FL.loadAsync(BASE + 'chars/' + cf);
      }
      const gl = await CHL.loadAsync(BASE + 'chars/' + CH[p.fig]);
      if (tok !== DF.tok || UI.cur !== k) {
        gl.scene.traverse(freeObj);
        return;
      }
      const f = rbPerson(gl, set, { h: p.h, stoop: p.stoop || 0, idleRate: 0.9 });
      f.walker = { talking: false };
      // in the doorway, half a step out, turned to the visitor
      const x = (h.door[0] + h.step[0]) / 2,
        y = (h.door[1] + h.step[1]) / 2,
        z = KERN.terrain(h.step[0], h.step[1]);
      f.g.position.copy(V(x, y, z));
      f.g.rotation.y = -Math.atan2(P.x - x, P.y - y);
      scene.add(f.g);
      DF.f = f;
      DF.k = k;
      markDirty(true);
    } catch (e) {
      console.warn('amt door figure', k, e);
    }
  }
  // the door bell: ding-dong (two soft triangle notes through the effects bus)
  function bell() {
    try {
      const R = audio.raw && audio.raw();
      if (!R || R.ctx.state !== 'running') return;
      const { ctx, sfx } = R,
        t = ctx.currentTime;
      for (const [f, dt] of [
        [659.3, 0],
        [523.3, 0.45],
      ]) {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t + dt);
        g.gain.linearRampToValueAtTime(0.1, t + dt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 1.2);
        o.connect(g);
        g.connect(sfx);
        o.start(t + dt);
        o.stop(t + dt + 1.3);
      }
    } catch (e) {
      console.warn('amt bell', e);
    }
  }
  function freeObj(o) {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'])
        if (m[t]) m[t].dispose();
      m.dispose();
    }
    if (o.isSkinnedMesh && o.skeleton && o.skeleton.boneTexture) o.skeleton.dispose();
  }
  function doorFigDrop() {
    DF.tok++;
    if (!DF.f) return;
    scene.remove(DF.f.g);
    DF.f.g.traverse(freeObj);
    DF.f = null;
    DF.k = null;
    markDirty(true);
  }
  function doorFigTick(dt) {
    const f = DF.f;
    if (!f) return;
    // the village shows this person somewhere close by (the garden, the evening): no second one
    const o = DPEOPLE.figs && DPEOPLE.figs[DF.k];
    if (o && o.g.visible && o.at && f.g.position && Math.hypot(o.at.x - P.x, o.at.y - P.y) < 30) return doorFigDrop();
    f.walker.talking = UI.cur === DF.k && performance.now() % 7000 < 4200;
    f.anim(Math.min(dt, 0.1), 0);
    markDirty();
  }
  // ======================= the homes of the villagers (ringing at the door) =======================
  let HOMES = null;
  function homes() {
    if (HOMES) return HOMES;
    if (window.DLIFE && window.DLIFE.homes) return window.DLIFE.homes(); // the villagers' own homes (dorf/dorf_life.js)
    // without the villagers' homes (dorf/dorf_life.js): the same rule – a house with a door near the Anger, apart from the others
    if (!VILLAGE || !VILLAGE.ready || !WCOL || !WCOL.ready || !VILLAGE.bld) return null;
    const ANGER = [222, -108];
    const C = VILLAGE.bld
      .filter(b => b.typ === 0 && b.id !== 215 && b.fac && b.fac.some(f => f.door))
      .map(b => ({ b, d: Math.hypot(b.cx - ANGER[0], b.cy - ANGER[1]) }))
      .filter(o => o.d > 35 && o.d < 280)
      .sort((a, z) => a.d - z.d);
    const out = {},
      used = [];
    let i = 0;
    for (const k of Object.keys(DTEXT.P || {})) {
      while (i < C.length) {
        const c = C[(i * 7) % C.length];
        i++;
        if (used.some(u => Math.hypot(u.cx - c.b.cx, u.cy - c.b.cy) < 28)) continue;
        const f = c.b.fac.find(q => q.door);
        const u = f.door.u,
          Dd = [f.ax + f.dx * u, f.ay + f.dy * u];
        out[k] = { id: c.b.id, door: Dd, step: [Dd[0] + f.nx * 0.9, Dd[1] + f.ny * 0.9] };
        used.push(c.b);
        break;
      }
    }
    return (HOMES = out);
  }
  const awayNow = k => !!(window.DLIFE && window.DLIFE.away && window.DLIFE.away(k, now()));
  const figNear = k => {
    const f = DPEOPLE.figs && DPEOPLE.figs[k];
    return !!(f && f.g.visible && f.at && Math.hypot(f.at.x - P.x, f.at.y - P.y) < 14);
  };
  for (const k of Object.keys(D.P))
    if (!D.P[k].npc)
      PLAY.act({
        id: 'amt:door:' + k,
        r: 1.9,
        prio: 0.15,
        label: () => {
          if (ST.phase === 'none' || UI.cur || !avail(k) || figNear(k)) return null;
          return 'Bei ' + nameOf(k) + ' klingeln';
        },
        pos: () => {
          const H = homes(),
            h = H && H[k];
          if (!h) return null;
          return [h.step[0], h.step[1], KERN.terrain(h.step[0], h.step[1]) + 1.2];
        },
        run: () => {
          const m = minOf(now());
          if (m < 8 * 60 || m >= 21 * 60) {
            think('Es ist ' + (m < 8 * 60 ? 'noch zu früh' : 'zu spät') + ' – da klingelt man im Dorf nicht mehr.');
            return;
          }
          if (awayNow(k) || DCAL.on('skat')) {
            think(
              'Niemand öffnet. ' +
                (DCAL.on('skat') ? 'Freitagabend – alle sind in der alten Schule.' : 'Das Auto ist weg.')
            );
            return;
          }
          bell();
          talk(k, 'door');
          doorFig(k);
        },
      });
  // the old school: voting, the count, introducing oneself, the Ortsteilrat
  const schoolDoor = () => {
    if (!DSCHOOL.built || !DSCHOOL.F) return null;
    const [x, y] = DSCHOOL.toW(DSCHOOL.F.du + 0.9, -1.0);
    return [x, y, DSCHOOL.F.zF + 1.0];
  };
  PLAY.act({
    id: 'amt:school',
    r: 2.4,
    prio: 0.45,
    label: () => {
      if (UI.cur) return null;
      if (ST.phase === 'nominated' && polls()) return ST.voted ? null : 'Wählen gehen (Wahllokal)';
      if (ST.phase === 'nominated' && counting()) return 'Bei der Auszählung zuschauen';
      if (ST.vote && ST.vote.counted && isEday() && counting() && !ST.vote.accepted) return 'Das Ergebnis';
      if (
        office() &&
        Object.values(ST.anl).some(a => a.st === 'open') &&
        minOf(now()) >= 17 * 60 &&
        minOf(now()) < 22 * 60
      )
        return 'Ortsteilrat: Sitzung eröffnen';
      return null;
    },
    pos: schoolDoor,
    run: () => {
      if (ST.phase === 'nominated' && polls()) vote();
      else if (ST.phase === 'nominated' && counting()) count();
      else if (ST.vote && ST.vote.counted && !ST.vote.accepted) result();
      else if (office()) ortsrat();
    },
  });
  // the car: off to the town hall
  PLAY.act({
    id: 'amt:car',
    r: 3.4,
    prio: 0.1,
    label: () =>
      canTrip() && !UI.cur && !VEH.cur && VEH.by && VEH.by.car ? 'Mit dem Auto ins Rathaus (Schleusingen)' : null,
    pos: () => {
      const v = VEH.by && VEH.by.car;
      return v ? [v.st.x, v.st.y, v.st.z + 1.0] : null;
    },
    run: () => trip(),
  });
  // the hydrant cover and the goats' fence (amt/amt_world.js builds them while the task runs)
  PLAY.act({
    id: 'amt:hydrant',
    r: 1.5,
    prio: 0.3,
    hold: 2.2,
    label: () => (ST.tasks.hydrant === 0 ? 'Laub vom Hydrantendeckel räumen' : null),
    pos: () => {
      const h = AMTWORLD.hydrantAt();
      return h ? [h[0], h[1], KERN.terrain(h[0], h[1]) + 0.3] : null;
    },
    run: () => {
      ST.tasks.hydrant = 1;
      AMTWORLD.hydrant(false, true);
      save();
      think('Da ist er: der Deckel des Unterflurhydranten, gelb umrandet. Manfred Bescheid sagen.');
    },
  });
  PLAY.act({
    id: 'amt:fence',
    r: 1.6,
    prio: 0.3,
    hold: 3,
    label: () => (ST.tasks.zaun === 0 ? 'Mit Ronald den Zaun flicken' : null),
    pos: () => {
      const f = AMTWORLD.fenceAt();
      return f ? [f[0], f[1], KERN.terrain(f[0], f[1]) + 0.6] : null;
    },
    run: () => {
      ST.tasks.zaun = 1;
      AMTWORLD.fence(false);
      L('ronald', 4, 'Ihr habt zusammen den Zaun geflickt');
      save();
      think('Neue Pfosten, das Drahtgeflecht gespannt. Hält. Jetzt Heike Bescheid sagen.');
    },
  });
  // ======================= showing the way: a marker over the goal, direction and distance in the HUD =======================
  // (the neighbours' tasks have their own tracker, game/quests.js; this one is for the election and the office: a person's door, the
  // hydrant, the fence, the bus stop, the school)
  const TRK = { k: null, el: null, mark: null, acc: 0, last: '' };
  function where(k) {
    if (D.P[k] && D.P[k].npc)
      return k === 'hubert' ? 'Huberts Hof, westlich vom Garten' : 'Ronalds Weide, südlich vom Garten';
    const H = homes(),
      h = H && H[k];
    const pl = h && KERN.place ? KERN.place(h.step[0], h.step[1]) : null;
    return pl ? pl.replace(/^Ratscher · /, '') : null;
  }
  function trackPos(k) {
    if (!k) return null;
    if (k === 'hydrant') return AMTWORLD.hydrantAt();
    if (k === 'fence') return AMTWORLD.fenceAt();
    if (k === 'bus') return [250.6, -99.6];
    if (k === 'schule') {
      const d = schoolDoor();
      return d ? [d[0], d[1]] : [216, -98];
    }
    if (D.P[k] && D.P[k].npc) return NPCS[k] ? [NPCS[k].x, NPCS[k].y] : null;
    const f = DPEOPLE.figs && DPEOPLE.figs[k];
    if (f && f.g.visible && f.at) return [f.at.x, f.at.y];
    const H = homes(),
      h = H && H[k];
    return h ? h.step : null;
  }
  const TRKNAME = {
    hydrant: 'Hydrant am Anger',
    fence: 'Zaun an Ronalds Weide',
    bus: 'Bushaltestelle',
    schule: 'Alte Schule',
  };
  function track(k) {
    TRK.k = k;
    TRK.last = '';
    trackTick(1);
  }
  function trackTick(dt) {
    TRK.acc += dt;
    if (TRK.acc < 0.25) return;
    TRK.acc = 0;
    if (!TRK.el) {
      TRK.el = document.createElement('div');
      TRK.el.className = 'ov';
      TRK.el.id = 'amttrack';
      TRK.el.hidden = true;
      TRK.el.setAttribute('role', 'button');
      TRK.el.title = 'Antippen: nicht mehr zeigen';
      TRK.el.addEventListener('click', () => track(null));
      ($('p-3d') || document.body).appendChild(TRK.el);
    }
    const p = TRK.k ? trackPos(TRK.k) : null,
      show = !!p && P.mode === 'walk' && UI.cur !== TRK.k;
    const d = p ? Math.hypot(p[0] - P.x, p[1] - P.y) : 0;
    if (p && d < 3.2 && P.mode === 'walk') {
      // arrived
      TRK.k = null;
    }
    const on = show && TRK.k;
    const txt = on
      ? (TRKNAME[TRK.k] || nameOf(TRK.k) + (D.P[TRK.k] && !D.P[TRK.k].npc && !figNear(TRK.k) ? ' (Haustür)' : '')) +
        '|' +
        Math.round(d) +
        '|' +
        Math.round(((Math.atan2(p[0] - P.x, p[1] - P.y) * 180) / Math.PI - P.yaw) / 8)
      : '';
    if (txt !== TRK.last) {
      TRK.last = txt;
      TRK.el.hidden = !on;
      if (on) {
        const [name, m, a8] = txt.split('|');
        TRK.el.innerHTML =
          '<b>Wahl und Amt</b><span>' +
          esc(name) +
          '</span><i style="transform:rotate(' +
          +a8 * 8 +
          'deg)">↑</i><em>' +
          m +
          ' m</em>';
      }
    }
    // the marker over the goal (a sprite like the tasks' one, in the colour of the folder)
    if (!TRK.mark) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const q = c.getContext('2d');
      q.translate(64, 64);
      q.beginPath();
      q.arc(0, -10, 34, 0, Math.PI * 2);
      q.fillStyle = 'rgba(20,18,15,0.55)';
      q.fill();
      q.beginPath();
      q.arc(0, -10, 27, 0, Math.PI * 2);
      q.fillStyle = '#8fd0ff';
      q.fill();
      q.fillStyle = '#1d3346';
      q.font = '700 34px sans-serif';
      q.textAlign = 'center';
      q.fillText('§', 0, 2);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      TRK.mark = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true, opacity: 0.92 })
      );
      TRK.mark.renderOrder = 999;
      TRK.mark.visible = false;
      TRK.mark.userData.noMerge = true;
      scene.add(TRK.mark);
    }
    if (on && d > 3.5) {
      const z = KERN.terrain(p[0], p[1]) + 3.2 + Math.sin(performance.now() / 420) * 0.08,
        sc = Math.min(1.2, Math.max(0.25, d * 0.03));
      TRK.mark.position.copy(V(p[0], p[1], z));
      TRK.mark.scale.set(sc, sc, 1);
      TRK.mark.visible = true;
      markDirty();
    } else if (TRK.mark.visible) {
      TRK.mark.visible = false;
      markDirty();
    }
  }
  // ======================= per frame =======================
  const TK = { acc: 0, warned: null };
  function tick(dt) {
    countTick(Math.min(dt, 0.25));
    doorFigTick(dt);
    trackTick(dt);
    TK.acc += dt;
    if (TK.acc < 0.5) return;
    TK.acc = 0;
    const t = now();
    // the matter starts on game day 2 in the morning, when one is out walking (the letter)
    if (ST.phase === 'none' && t >= 1440 + 9 * 60 && P.mode === 'walk' && LOAD.ready && !QS.get('noamt')) begin();
    if ((ST.phase === 'lost' || ST.phase === 'missed') && ST.retry != null && t >= ST.retry) begin();
    // deadlines
    if ((ST.phase === 'asked' || ST.phase === 'candidate') && ST.deadline != null && t > ST.deadline) {
      ST.phase = 'missed';
      ST.retry = (ST.eday + 12) * 1440 + 9 * 60;
      save();
      toast('Die Frist für Wahlvorschläge ist abgelaufen. Uwe Bachmann ist der einzige Bewerber.', 8000);
      renderBook();
    }
    // election day: a reminder; the count happens without one, too (the result comes the next morning)
    if (ST.phase === 'nominated' && isEday(t) && TK.warned !== 'eday' + ST.eday && minOf(t) >= 8 * 60) {
      TK.warned = 'eday' + ST.eday;
      toast(
        'Heute ist Wahltag in Ratscher: Wahllokal in der alten Schule, 8 bis 18 Uhr. Ab 18 Uhr öffentliche Auszählung.',
        9000
      );
    }
    if (
      ST.phase === 'nominated' &&
      ST.eday != null &&
      t >= ST.eday * 1440 + 21 * 60 &&
      !CNT.on &&
      !(ST.vote && ST.vote.counted)
    ) {
      count(true);
      UI.close();
      toast(
        ST.vote && ST.vote.won
          ? 'Das Ergebnis der Nachwahl: Du bist gewählt! Ingrid hat die Mappe vorbeigebracht.'
          : 'Das Ergebnis der Nachwahl: Uwe Bachmann ist gewählt.',
        9000
      );
      if (ST.vote && ST.vote.won) accept();
      else result();
      UI.close();
    }
    // presence: a Friday evening in the school, the fire – once per evening counted
    if (ST.phase !== 'none' && DORF.S) {
      const d = dayOf(t);
      if (DORF.S.skat && DORF.S.inside && !ST.seen.includes('skat:' + d)) {
        ST.seen.push('skat:' + d);
        for (const k of D.KEYS) if (!D.P[k].npc && avail(k)) L(k, 2, 'Du warst beim Skatabend');
        save();
      }
      const F = DORF.fire && DORF.fire.at;
      if (DORF.S.fire && F && Math.hypot(P.x - F[0], P.y - F[1]) < 14 && !ST.seen.includes('fire:' + d)) {
        ST.seen.push('fire:' + d);
        for (const k of D.KEYS) if (!D.P[k].npc && avail(k)) L(k, 2, 'Du warst beim Feuer am Acker');
        save();
      }
      if (ST.seen.length > 60) ST.seen.splice(0, ST.seen.length - 60);
    }
    // in office the people come to you: every other morning a note in the letterbox with a concern not yet on the list
    if (
      office() &&
      ST.since != null &&
      minOf(t) >= 9 * 60 &&
      dayOf(t) > dayOf(ST.since) &&
      (dayOf(t) - dayOf(ST.since)) % 2 === 0
    ) {
      const d = dayOf(t);
      if (TK.note !== d) {
        TK.note = d;
        const next = Object.entries(D.ANLIEGEN).find(([id, A]) => !ST.anl[id] && avail(A.from));
        if (next) {
          const [id, A] = next;
          ST.anl[id] = { st: 'open', t, why: '', d: '' };
          save();
          toast('Ein Zettel im Briefkasten, von ' + nameOf(A.from) + ': „' + A.ask + '“ (Mappe: Anliegen)', 10000);
          BOOK.btn.querySelector('.dot').hidden = false;
        }
      }
    }
    // Katrin's school bus: on a school day 6:45–7:30 at the stop
    if (ST.tasks.bus === 0 && P.mode === 'walk') {
      const wd = DCAL.wd(t),
        m = minOf(t);
      if (wd >= 1 && wd <= 5 && m >= 6 * 60 + 45 && m <= 7 * 60 + 30 && Math.hypot(P.x - 250.6, P.y + 99.6) < 9) {
        ST.tasks.bus = 1;
        save();
        think(
          (m < 7 * 60 + 5 ? 'Noch dämmrig. ' : '') +
            'Drei Kinder mit Ranzen an der Straße, ein Pendler rauscht mit 70 vorbei. Der Bus kommt um 7:12. Katrin hatte recht.',
          9000
        );
      }
    }
    AMTWORLD.refresh(ST, t);
    // the folder follows the matter (re-drawn only when its status line changes – not under the reader's fingers)
    const stx = status();
    if (stx !== TK.status) {
      TK.status = stx;
      renderBook();
    }
    // a Friday evening in the school during the campaign: Ingrid asks whether one wants to say a few words (once per evening)
    if (
      campaign() &&
      ST.tasks.vorstellen !== 'done' &&
      DORF.S &&
      DORF.S.skat &&
      DORF.S.inside &&
      !UI.cur &&
      !(DORF.UI && DORF.UI.cur)
    ) {
      TK.inside = (TK.inside || 0) + 0.5;
      if (TK.inside > 8 && TK.asked !== dayOf(t)) {
        TK.asked = dayOf(t);
        speech();
      }
    } else TK.inside = 0;
    // the panel closes when one walks away
    if (UI.cur && UI.at && Math.hypot(P.x - UI.at[0], P.y - UI.at[1]) > 6) UI.close();
  }
  (window.TICKS || (window.TICKS = [])).push(tick);
  // ======================= drawings for the scenes (small SVGs, no textures) =======================
  const SCENES = {
    rathaus: () =>
      '<svg viewBox="0 0 320 120" class="pic" aria-hidden="true"><rect x="0" y="96" width="320" height="24" fill="#cdbfa6"/><path d="M70 96V44l90-28 90 28v52z" fill="#e9dcc2" stroke="#7d6a4f"/><path d="M60 46 160 14l100 32" fill="none" stroke="#7a3b2a" stroke-width="7"/><rect x="146" y="64" width="28" height="32" fill="#6b4a2b"/><g fill="#9fb4c4" stroke="#6d5a42">' +
      [90, 116, 196, 222].map(x => '<rect x="' + x + '" y="52" width="14" height="20"/>').join('') +
      '</g><rect x="150" y="30" width="20" height="14" fill="#f4ecd9" stroke="#7d6a4f"/><text x="160" y="41" font-size="7" text-anchor="middle" fill="#3b2f22">⌚</text><circle cx="40" cy="70" r="20" fill="#7d9a5a"/><rect x="38" y="80" width="4" height="16" fill="#5b4430"/><circle cx="285" cy="72" r="18" fill="#8aa866"/><rect x="283" y="82" width="4" height="14" fill="#5b4430"/></svg>',
    ballot: () =>
      '<svg viewBox="0 0 320 110" class="pic" aria-hidden="true"><rect x="0" y="0" width="320" height="110" fill="#efe6d4"/><rect x="20" y="20" width="90" height="70" fill="#fffdf6" stroke="#8d7b62"/><text x="65" y="34" font-size="7" text-anchor="middle" fill="#3b2f22">Stimmzettel</text><text x="30" y="52" font-size="7" fill="#3b2f22">○ Bachmann, Uwe</text><text x="30" y="68" font-size="7" fill="#3b2f22">○ (du)</text><rect x="140" y="30" width="60" height="60" fill="#3d4c5e"/><rect x="160" y="28" width="20" height="4" fill="#111"/><text x="170" y="66" font-size="8" text-anchor="middle" fill="#e8eef4">Urne</text><path d="M230 90V20h70v70" fill="#d9cdb6" stroke="#8d7b62"/><text x="265" y="56" font-size="8" text-anchor="middle" fill="#3b2f22">Kabine</text></svg>',
    tally: c => {
      const n = Math.max(1, c.me + c.opp + c.inv);
      const bar = (v, col) => Math.round((260 * v) / Math.max(20, n));
      return (
        '<div class="tally"><div><span>Du</span><b style="width:' +
        bar(c.me) +
        'px;background:#9b6a2f"></b><em>' +
        c.me +
        '</em></div><div><span>Uwe Bachmann</span><b style="width:' +
        bar(c.opp) +
        'px;background:#5a6f45"></b><em>' +
        c.opp +
        '</em></div><div><span>ungültig</span><b style="width:' +
        bar(c.inv) +
        'px;background:#8a8a8a"></b><em>' +
        c.inv +
        '</em></div><small>' +
        (c.res ? c.i + ' von ' + c.res.ballots.length + ' Stimmzetteln' : '') +
        '</small></div>'
      );
    },
    room: kind =>
      '<svg viewBox="0 0 320 110" class="pic" aria-hidden="true"><rect x="0" y="0" width="320" height="110" fill="' +
      (kind === 'stadtrat' ? '#e7dfcf' : '#e9dcc4') +
      '"/>' +
      (kind === 'stadtrat'
        ? '<rect x="40" y="18" width="240" height="22" fill="#6d4f33"/><g fill="#3c4a5a">' +
          [70, 110, 150, 190, 230].map(x => '<circle cx="' + x + '" cy="14" r="6"/>').join('') +
          '</g><path d="M20 60h280M20 84h280" stroke="#6d4f33" stroke-width="10"/><g fill="#5d6b4a">' +
          [40, 70, 100, 130, 190, 220, 250, 280]
            .map(x => '<circle cx="' + x + '" cy="52" r="5"/><circle cx="' + x + '" cy="76" r="5"/>')
            .join('') +
          '</g><circle cx="160" cy="100" r="6" fill="#9b6a2f"/><text x="160" y="35" font-size="8" text-anchor="middle" fill="#f4ecd9">Bürgermeister · Verwaltung</text>'
        : '<rect x="90" y="40" width="140" height="34" rx="6" fill="#7a5a3a"/><g fill="#4f5d6e">' +
          [110, 140, 180, 210].map(x => '<circle cx="' + x + '" cy="34" r="7"/>').join('') +
          '</g><circle cx="160" cy="84" r="7" fill="#9b6a2f"/><text x="160" y="61" font-size="8" text-anchor="middle" fill="#f4ecd9">Ortsteilrat Ratscher</text><g fill="#8a8a7a"><circle cx="40" cy="80" r="5"/><circle cx="56" cy="84" r="5"/><circle cx="276" cy="82" r="5"/></g>') +
      '</svg>',
  };
  // ======================= test hooks, the start with ?amt=… =======================
  const state = () => ({
    phase: ST.phase,
    eday: ST.eday,
    deadline: ST.deadline,
    sig: M.sigCount(ST),
    signed: ST.sig.slice(),
    rep: Object.fromEntries(D.KEYS.map(k => [k, Math.round(ST.rep[k])])),
    pos: Object.fromEntries(Object.entries(ST.pos).map(([i, p]) => [i, p.o])),
    tasks: Object.assign({}, ST.tasks),
    vote: ST.vote,
    voted: ST.voted,
    anl: Object.fromEntries(Object.entries(ST.anl).map(([k, a]) => [k, a.st])),
    budget: ST.budget,
    built: Object.keys(ST.built),
    sworn: ST.sworn,
    expect: +M.expect(ST, avail).toFixed(3),
    panel: UI.cur,
    say: UI.el.querySelector('.say').textContent,
    buttons: [...UI.el.querySelectorAll('.topics button')].map(b => b.textContent),
    book: !BOOK.el.hidden,
    homes: homes() ? Object.keys(homes()).length : 0,
    world: AMTWORLD.state(),
    avail: D.KEYS.filter(avail),
  });
  // click a button of the panel by (a part of) its label – tests
  function press(txt) {
    const b = [...UI.el.querySelectorAll('.topics button')].find(e => e.textContent.includes(txt));
    if (b) b.click();
    return !!b;
  }
  // jump to a stage of the matter (tests, the ?amt= start): the clock and the state move together
  function jump(stage, o = {}) {
    const t0 = Math.max(now(), 1440 + 9 * 60);
    if (ST.phase === 'none' || o.fresh) {
      ST = M.fresh(bonus());
      CLOCK.t = t0;
      begin(true);
    }
    if (stage === 'brief') {
      letter();
      return state();
    }
    if (['wahlkampf', 'wahltag', 'zaehlen', 'amt', 'stadtrat'].includes(stage) && ST.phase === 'asked')
      ST.phase = 'candidate';
    if (ST.phase === 'candidate' && o.sig !== false && M.sigCount(ST) < D.SIGS) {
      // the signatures as if gathered: everyone who knows the player a little, the rest by good friends among the neighbours
      for (const k of ['ingrid', 'gerhard', 'manfred', 'katrin', 'wolfgang', 'heike', 'jens', 'ronald'])
        if (avail(k)) M.trySign(ST, k);
      ST.extra = Math.max(ST.extra, D.SIGS - M.sigCount(ST) + ST.extra);
    }
    if (['wahltag', 'zaehlen', 'amt', 'stadtrat'].includes(stage) && ST.phase === 'candidate') ST.phase = 'nominated';
    if (stage === 'wahltag') CLOCK.t = ST.eday * 1440 + 10 * 60;
    if (stage === 'zaehlen') CLOCK.t = ST.eday * 1440 + 18 * 60 + 5;
    if (['amt', 'stadtrat'].includes(stage) && ST.phase === 'nominated') {
      for (const k of D.KEYS) if (!D.P[k].opp) ST.rep[k] = Math.max(ST.rep[k], 70);
      CLOCK.t = ST.eday * 1440 + 18 * 60 + 5;
      count(true);
      UI.close();
      if (ST.vote && ST.vote.won) accept();
      UI.close();
    }
    if (stage === 'stadtrat') {
      let d = dayOf(now()) + 1;
      while (DCAL.wd(d * 1440 + 600) !== 4) d++;
      CLOCK.t = d * 1440 + 18 * 60;
      for (const id of ['laterne', 'tempo30']) ST.anl[id] = { st: 'stadt', t: now(), why: '', d: '', una: 1 };
    }
    if (DN && DN.active) DN.update(true);
    save();
    renderBook();
    return state();
  }
  // the walker to (x, y), turned to yaw (deg) – as the village life puts one at the school door (tests)
  function put(x, y, yaw = 0) {
    if (PLAY.seated && PLAY.seated()) PLAY.stand(true);
    P.mode = 'walk';
    document.body.dataset.mode = 'walk';
    P.x = x;
    P.y = y;
    P.feet = floorAt(x, y, KERN.terrain(x, y) + 0.3);
    P.vz = 0;
    P.yaw = P.body = yaw;
    P.pitch = 0;
    P.air = false;
    markDirty(true);
  }
  function reset() {
    ST = M.fresh(bonus());
    SAVE.set(KEY, null);
    CNT.on = false;
    UI.close();
    AMTWORLD.refresh(ST, now(), true);
    renderBook();
  }
  whenLoaded(() => {
    setTimeout(() => {
      try {
        watchPanels();
        renderBook();
        AMTWORLD.refresh(ST, now());
      } catch (e) {
        console.warn('amt start', e);
      }
      const q = QS.get('amt');
      if (!q) return;
      setTimeout(() => {
        try {
          jump(q);
          if (q === 'zaehlen') {
            if (DORF.atDoor) DORF.atDoor();
            count();
          } else if (q === 'wahltag' && DORF.atDoor) DORF.atDoor();
          else if (q === 'stadtrat') rathaus();
          else if (q === 'amt') toggleBook(true);
        } catch (e) {
          console.warn('amt ?amt', e);
        }
      }, 1200);
    }, 600);
  });
  return {
    get ST() {
      return ST;
    },
    UI,
    BOOK,
    state,
    jump,
    talk,
    press,
    begin,
    letter,
    trip,
    rathaus,
    vote,
    count,
    result,
    accept,
    ortsrat,
    council,
    speech,
    toggleBook,
    renderBook,
    homes,
    reset,
    put,
    avail,
    model: M,
    data: D,
  };
})();
window.AMT = AMT;
