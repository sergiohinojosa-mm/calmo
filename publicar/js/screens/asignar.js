// La maestra asigna una práctica a varios alumnos a la vez: ejercicio, minutos y horario
// una sola vez, y marca a quién. Quien es Peque recibe una práctica de Peque de 1 a 3 min.
// También puede asignar un programa por semanas: cada semana con su ejercicio y sus minutos.

import { esc, icon, toast, dayKey, DIAS_L, DIAS } from '../ui.js';
import { exercisesFor, nameFor, byId } from '../catalog.js';

const MINUTES = [3, 5, 10, 15];
const WEEKS = [2, 3, 4, 6, 8];
// Propuesta inicial de un programa: de respirar ligero a la respiración reducida con pausas.
// La maestra la cambia semana por semana.
const START_PLAN = [['ligero', 5], ['ligero', 10], ['pausas', 10], ['pausas', 10], ['ligero', 10], ['pausas', 10], ['coherente', 10], ['pausas', 10]];
const PEQUE_MINUTES = [1, 2, 3];
const nameByTime = (t) => {
  const h = Number(t.slice(0, 2));
  return h < 11 ? 'Al despertar' : h >= 19 ? 'Antes de dormir' : 'Práctica';
};

const pills = (name, values, selected, label = (v) => `${v} min`) => values
  .map((v) => `<button type="button" class="pill" data-${name}="${v}" aria-pressed="${v === selected}">${esc(label(v))}</button>`).join('');

export default {
  tab: 'asignar',
  render(ctx) {
    const { store, query } = ctx;
    const people = store.familyMembers();
    const pre = query.get('p');
    // Ejercicios que sirven a adultos y Junior (Peque tiene los suyos). Lo puntual no se asigna.
    const shared = exercisesFor('junior').filter((e) => e.mode !== 'serie' && !e.puntual);
    const peque = exercisesFor('peque');
    if (!people.length) return `<div class="top"><h1 class="h1">Asignar</h1></div><p class="sub">Todavía no hay alumnos.</p>`;
    return `<div class="top">${pre ? `<a class="icon-btn" href="#/alumno/${esc(pre)}" aria-label="Volver">${icon('back', 20)}</a>` : ''}<h1 class="h1">Asignar</h1></div>
      <form id="assign" class="stack" novalidate>
        <div class="seg" role="group" aria-label="Qué asignar" id="mode">
          <button type="button" data-mode="una" aria-pressed="true">Una práctica</button>
          <button type="button" data-mode="programa" aria-pressed="false">Programa por semanas</button>
        </div>
        <div class="card stack" style="gap:10px" role="group" aria-labelledby="g-who">
          <span class="muted" id="g-who">¿A quién?</span>
          <div class="pills" id="who">${people.map((p) => `<button type="button" class="pill" data-who="${esc(p.id)}" data-kind="${p.kind}" aria-pressed="${p.id === pre || (!pre && p.kind !== 'peque')}">${esc(p.name)}</button>`).join('')}</div>
        </div>
        <div class="card stack" style="gap:10px;display:none" role="group" aria-labelledby="g-prog" id="progBox">
          <span class="muted" id="g-prog">¿Cuántas semanas?</span>
          <div class="pills" id="weeks" role="group" aria-label="Semanas">${pills('weeks', WEEKS, 4, (v) => `${v} semanas`)}</div>
          <label class="stack" style="gap:6px"><span class="muted">Empieza</span><input class="field" type="date" name="start" value="${dayKey()}" aria-label="Fecha de inicio"></label>
          ${START_PLAN.map(([id, min], i) => `<div class="tile stack" data-week="${i}" style="gap:8px;${i < 4 ? '' : 'display:none'}">
            <span style="font-weight:600;font-size:14px">Semana ${i + 1}</span>
            <select class="field" name="w${i}" aria-label="Ejercicio de la semana ${i + 1}">${shared.map((e) => `<option value="${e.id}" ${e.id === id ? 'selected' : ''}>${esc(nameFor(e, 'adulto'))}</option>`).join('')}</select>
            <div class="pills" data-wmin="${i}" role="group" aria-label="Minutos de la semana ${i + 1}">${pills('wm', MINUTES, min)}</div>
          </div>`).join('')}
          <p class="muted" id="progPeque" style="margin:0;display:none">Los programas son para adultos y Junior; Peque no entra.</p>
        </div>
        <div class="card stack" style="gap:10px" role="group" aria-labelledby="g-what" id="whatBox">
          <span class="muted" id="g-what">¿Qué?</span>
          <div class="seg" role="group" aria-label="Tipo" id="type">
            <button type="button" data-type="sesion" aria-pressed="true">Ejercicio</button>
            <button type="button" data-type="bolt" aria-pressed="false">Medir BOLT</button>
          </div>
          <div id="exBox" class="stack" style="gap:10px">
            <select class="field" name="exercise" aria-label="Ejercicio">${shared.map((e) => `<option value="${e.id}">${esc(nameFor(e, 'adulto'))}</option>`).join('')}</select>
            <div class="pills" id="min" role="group" aria-label="Minutos">${pills('min', MINUTES, 5)}</div>
          </div>
          <div id="pequeBox" class="stack" style="gap:10px;display:none">
            <span class="muted">Para Peque (1 a 3 min)</span>
            <select class="field" name="pequeExercise" aria-label="Ejercicio de Peque">${peque.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select>
            <div class="pills" id="pmin" role="group" aria-label="Minutos de Peque">${pills('pmin', PEQUE_MINUTES, 1)}</div>
          </div>
          <p class="muted" id="boltNote" style="margin:0;display:none">La medición de BOLT no se asigna a Peque.</p>
        </div>
        <div class="card stack" style="gap:10px" role="group" aria-labelledby="g-when">
          <span class="muted" id="g-when">¿Cuándo?</span>
          <input class="field" type="time" name="time" value="20:30" aria-label="Hora" required>
          <div class="seg" role="group" aria-label="Frecuencia" id="freq" style="grid-auto-columns:auto">
            <button type="button" data-freq="daily" aria-pressed="true">Diario</button>
            <button type="button" data-freq="weekdays" aria-pressed="false">L a V</button>
            <button type="button" data-freq="days" aria-pressed="false">Días</button>
            <button type="button" data-freq="once" aria-pressed="false">Una vez</button>
          </div>
          <div class="row" id="days" style="gap:6px;display:none">${DIAS_L.map((d, i) => `<button type="button" class="pill" data-day="${i}" aria-label="${DIAS[i]}" aria-pressed="false" style="flex:1;min-width:0;padding:0">${d}</button>`).join('')}</div>
          <input class="field" type="date" name="date" value="${dayKey()}" aria-label="Fecha" style="display:none">
        </div>
        <div class="card stack" style="gap:8px">
          <span class="muted">Nota (opcional)</span>
          <input class="field" name="note" maxlength="280" autocomplete="off" aria-label="Nota (opcional)" placeholder="Ej. Respira suave antes de dormir">
        </div>
        <p id="err" role="alert" style="margin:0;color:var(--brasa);font-size:14px;min-height:18px"></p>
        <button class="btn primary block" type="submit">${icon('check', 18)} Asignar</button>
      </form>`;
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const form = root.querySelector('#assign');
    if (!form) return null;
    const err = root.querySelector('#err');
    const pressed = (box) => [...root.querySelectorAll(`${box} [aria-pressed="true"]`)];
    const one = (box, el) => root.querySelectorAll(`${box} [aria-pressed]`).forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    const sync = () => {
      const program = pressed('#mode')[0]?.dataset.mode === 'programa';
      const type = pressed('#type')[0]?.dataset.type;
      const kinds = pressed('#who').map((b) => b.dataset.kind);
      // En un programa no hay «Una vez»: cada semana se repite con la frecuencia elegida.
      const once = root.querySelector('#freq [data-freq="once"]');
      once.style.display = program ? 'none' : '';
      if (program && once.getAttribute('aria-pressed') === 'true') one('#freq', root.querySelector('#freq [data-freq="daily"]'));
      const freq = pressed('#freq')[0]?.dataset.freq;
      const weeks = Number(pressed('#weeks')[0]?.dataset.weeks) || 4;
      root.querySelector('#progBox').style.display = program ? '' : 'none';
      root.querySelector('#whatBox').style.display = program ? 'none' : '';
      root.querySelectorAll('[data-week]').forEach((w) => { w.style.display = Number(w.dataset.week) < weeks ? '' : 'none'; });
      root.querySelector('#progPeque').style.display = program && kinds.includes('peque') ? '' : 'none';
      root.querySelectorAll('[data-wmin]').forEach((box) => {
        const ex = byId(form.elements.namedItem(`w${box.dataset.wmin}`).value);
        box.querySelectorAll('[data-wm]').forEach((b) => { b.disabled = !!ex?.maxMin && Number(b.dataset.wm) > ex.maxMin; });
      });
      root.querySelector('#exBox').style.display = type === 'sesion' && kinds.some((k) => k !== 'peque') ? '' : 'none';
      root.querySelector('#pequeBox').style.display = type === 'sesion' && kinds.includes('peque') ? '' : 'none';
      root.querySelector('#boltNote').style.display = type === 'bolt' && kinds.includes('peque') ? '' : 'none';
      root.querySelector('#days').style.display = freq === 'days' ? '' : 'none';
      form.elements.namedItem('date').style.display = freq === 'once' ? '' : 'none';
      // El máximo del ejercicio manda (por ejemplo, el 4-7-8 es corto).
      const ex = byId(form.elements.namedItem('exercise').value);
      root.querySelectorAll('#min [data-min]').forEach((b) => { b.disabled = !!ex?.maxMin && Number(b.dataset.min) > ex.maxMin; });
      err.textContent = '';
    };
    form.addEventListener('click', (e) => {
      const b = e.target.closest('button[aria-pressed]');
      if (!b) return;
      if (b.closest('#who') || b.closest('#days')) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      else if (b.closest('#mode')) one('#mode', b);
      else if (b.closest('#weeks')) one('#weeks', b);
      else if (b.closest('[data-wmin]')) b.closest('[data-wmin]').querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      else if (b.closest('#type')) one('#type', b);
      else if (b.closest('#freq')) one('#freq', b);
      else if (b.closest('#min')) one('#min', b);
      else if (b.closest('#pmin')) one('#pmin', b);
      sync();
    });
    form.addEventListener('change', sync);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const who = pressed('#who');
      if (!who.length) { err.textContent = 'Elige al menos a una persona.'; return; }
      const type = pressed('#type')[0].dataset.type;
      const freq = pressed('#freq')[0].dataset.freq;
      const days = pressed('#days').map((b) => Number(b.dataset.day));
      if (freq === 'days' && !days.length) { err.textContent = 'Elige al menos un día.'; return; }
      const time = form.elements.namedItem('time').value || '20:30';
      if (pressed('#mode')[0].dataset.mode === 'programa') {
        const people = who.filter((b) => b.dataset.kind !== 'peque').map((b) => b.dataset.who);
        if (!people.length) { err.textContent = 'Los programas son para adultos y Junior.'; return; }
        const count = Number(pressed('#weeks')[0]?.dataset.weeks) || 4;
        const weeks = Array.from({ length: count }, (_, i) => {
          const ex = byId(form.elements.namedItem(`w${i}`).value);
          const min = Number(root.querySelector(`[data-wmin="${i}"] [aria-pressed="true"]`)?.dataset.wm) || 5;
          return { exerciseId: ex.id, minutes: Math.min(ex.maxMin || 60, min) };
        });
        store.assignProgram({ people, weeks, start: form.elements.namedItem('start').value || dayKey(), time, freq, days, name: nameByTime(time), note: form.elements.namedItem('note').value });
        toast(`Programa de ${count} semanas asignado${people.length > 1 ? ` a ${people.length} personas` : ''}`);
        go(people.length === 1 ? `alumno/${people[0]}` : 'alumnos');
        return;
      }
      const base = { kind: type, name: type === 'bolt' ? 'Medir BOLT' : nameByTime(time), time, freq, days, date: freq === 'once' ? form.elements.namedItem('date').value : undefined, note: form.elements.namedItem('note').value };
      const big = who.filter((b) => b.dataset.kind !== 'peque').map((b) => b.dataset.who);
      const small = who.filter((b) => b.dataset.kind === 'peque').map((b) => b.dataset.who);
      const ex = byId(form.elements.namedItem('exercise').value);
      const min = Math.min(ex?.maxMin || 60, Number(pressed('#min')[0]?.dataset.min) || 5);
      let made = store.assignPractice({ ...base, people: big, exerciseId: ex?.id, minutes: min }).length;
      if (type === 'sesion' && small.length) {
        made += store.assignPractice({ ...base, people: small, exerciseId: form.elements.namedItem('pequeExercise').value, minutes: Number(pressed('#pmin')[0]?.dataset.pmin) || 1 }).length;
      }
      if (!made) { err.textContent = 'La medición de BOLT no se asigna a Peque.'; return; }
      toast(made === 1 ? 'Práctica asignada' : `Práctica asignada a ${made} personas`);
      go(who.length === 1 ? `alumno/${who[0].dataset.who}` : 'alumnos');
    });
    sync();
    return null;
  },
};
