// @ts-check
// ===================== TASKS: tasks as data (refactor phase 2, building block 2) =====================
// A task is defined once as data – title, who gives it, its steps – and runs by itself: a step is done when an event of KERN arrives
// (KERN.emit, e.g. 'place' { name }, 'talk' { who }, 'take' { id }, or a feature's own 'gplan:gekauft'), optionally only when its condition
// on the event's data holds, or when a polled check turns true. The state of every task is saved (pav-tasks-v1), and the tasks appear in
// the one journal (KERN.tasks, key J; game/quests.js shows it and banners the events task:start, task:step, task:done).
//   TASKS.define({ id: 'gplan-kaufen', title: 'Pflanzen bei Kammbach kaufen', who: 'Baumschule Kammbach',
//                  start: { on: 'gplan:liste' },                                  // or TASKS.start(id) from code
//                  steps: [{ text: 'Fahr nach Kloster Veßra …', target: () => [x, y], on: 'place', when: d => /Kammbach/.test(d.name) },
//                          { text: 'Lad die Pflanzen ins Auto.', check: () => cargoFull() }],
//                  done: 'Die Pflanzen sind daheim.' })
//   TASKS.start(id) · TASKS.advance(id) · TASKS.state(id) → { st: 'läuft' | 'erledigt', i } | null · TASKS.reset(id) · TASKS.list()
// Old tasks (game/quests.js, dorf/dorf.js, amt/amt.js) keep their own logic for now and list themselves in the journal as sources.
import { SAVE } from './save.js';
import { KERN } from './kern.js';
/**
 * @typedef {object} TaskStep
 * @property {string} text                       what to do, shown in the journal and on the task card
 * @property {() => number[] | null} [target]   where to go (arrow and distance on the task card)
 * @property {number} [z]                         height of the marker over the target
 * @property {string} [on]                        the event that finishes the step
 * @property {(data: any) => boolean} [when]      the step counts only if this holds for the event's data
 * @property {() => any} [check]                 or: polled twice a second, the step is done when it turns true
 */
/**
 * @typedef {object} TaskDef
 * @property {string} id
 * @property {string} title
 * @property {string} [who]
 * @property {TaskStep[]} steps
 * @property {{ on: string, when?: (data: any) => boolean }} [start]  started by an event (else by TASKS.start)
 * @property {string} [done]  shown in the journal once finished
 */
/**
 * The task runner for one KERN and one SAVE – the app has one (TASKS), the unit tests make their own.
 * @param {any} K  KERN
 * @param {any} S  SAVE
 */
export function makeTasks(K, S) {
  const KEY = 'pav-tasks-v1';
  /** @type {Map<string, TaskDef>} */
  const DEF = new Map();
  /** @type {{ v: number, t: Record<string, { st: string, i: number }> }} */
  const ST = { v: 1, t: {} };
  {
    const s = S.get(KEY);
    if (s && s.t && typeof s.t === 'object')
      for (const [id, e] of Object.entries(s.t))
        if (e && (e.st === 'läuft' || e.st === 'erledigt') && Number.isInteger(e.i) && e.i >= 0)
          ST.t[id] = { st: e.st, i: e.i };
  }
  const save = () => S.set(KEY, ST);
  const holds = (fn, data) => {
    try {
      return !fn || !!fn(data);
    } catch (e) {
      return false;
    }
  };
  /** @param {TaskDef} def */
  function define(def) {
    DEF.set(def.id, def);
    const e = ST.t[def.id];
    if (e) e.i = Math.min(def.steps.length - 1, e.i);
    return def;
  }
  function start(id) {
    const d = DEF.get(id);
    if (!d || ST.t[id]) return false;
    ST.t[id] = { st: 'läuft', i: 0 };
    save();
    K.emit('task:start', { id, title: d.title, step: d.steps[0].text });
    return true;
  }
  function advance(id) {
    const d = DEF.get(id),
      e = ST.t[id];
    if (!d || !e || e.st !== 'läuft') return false;
    e.i++;
    if (e.i >= d.steps.length) {
      e.st = 'erledigt';
      e.i = d.steps.length - 1;
      save();
      K.emit('task:done', { id, title: d.title, done: d.done || '' });
    } else {
      save();
      K.emit('task:step', { id, title: d.title, step: d.steps[e.i].text });
    }
    return true;
  }
  function reset(id) {
    if (!ST.t[id]) return;
    delete ST.t[id];
    save();
  }
  // events: a running step waiting for this one; a task starting with it
  K.on('*', (data, name) => {
    if (String(name).startsWith('task:')) return;
    for (const [id, d] of DEF) {
      const e = ST.t[id];
      if (!e) {
        if (d.start && d.start.on === name && holds(d.start.when, data)) start(id);
        continue;
      }
      if (e.st !== 'läuft') continue;
      const st = d.steps[e.i];
      if (st.on && st.on === name && holds(st.when, data)) advance(id);
    }
  });
  // polled checks, twice a second (KERN.update)
  let acc = 0;
  K.tick(dt => {
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    for (const [id, d] of DEF) {
      const e = ST.t[id];
      if (!e || e.st !== 'läuft') continue;
      const st = d.steps[e.i];
      if (st.check && holds(st.check)) advance(id);
    }
  }, 'tasks');
  // the journal (order 15: after the neighbours' tasks, before the village's)
  K.tasks.source({
    id: 'aufgaben',
    order: 15,
    list: () =>
      [...DEF.values()]
        .filter(d => ST.t[d.id])
        .map(d => {
          const e = ST.t[d.id],
            st = d.steps[e.i],
            run = e.st === 'läuft';
          return {
            id: d.id,
            title: d.title,
            who: d.who || '',
            status: e.st,
            text: run ? st.text : d.done || 'Erledigt.',
            target: run && st.target ? st.target : null,
            z: (run && st.z) || 0,
          };
        }),
  });
  return {
    define,
    start,
    advance,
    reset,
    state: id => (ST.t[id] ? { ...ST.t[id] } : null),
    list: () => [...DEF.keys()],
  };
}
export const TASKS = makeTasks(KERN, SAVE);
window.TASKS = TASKS;
