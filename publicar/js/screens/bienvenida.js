// Primera vez: se configura quién respira en este teléfono.
// Los nombres se guardan solo en el teléfono; nunca viajan en el código de la app.

import { esc, icon, moment } from '../ui.js';
import { heroSVG } from '../hero.js';

const KINDS = [['adulto', 'Adulto'], ['junior', 'Junior · 7 a 15'], ['peque', 'Peque · hasta 6']];
const kindForAge = (age) => (!age ? null : age <= 6 ? 'peque' : age <= 15 ? 'junior' : 'adulto');

function personRow(i, kind = 'adulto') {
  return `<div class="tile stack" data-person="${i}" style="gap:10px">
    <div class="row" style="gap:10px">
      <label class="stack" style="gap:6px;flex:2;min-width:0"><span class="muted">Nombre</span>
        <input class="field" name="name" maxlength="24" autocomplete="off" placeholder="${i === 0 ? 'Tu nombre' : 'Nombre'}"></label>
      <label class="stack" style="gap:6px;flex:1;min-width:0"><span class="muted">Edad</span>
        <input class="field" name="age" type="number" inputmode="numeric" min="1" max="99" placeholder="—"></label>
    </div>
    <div class="seg" role="group" aria-label="Tipo de perfil">
      ${KINDS.map(([k, label]) => `<button type="button" data-kind="${k}" aria-pressed="${k === kind}">${label}</button>`).join('')}
    </div>
    ${i === 0 ? '' : `<button type="button" class="btn small" data-remove style="align-self:flex-start">${icon('trash', 16)} Quitar</button>`}
  </div>`;
}

export default {
  full: true,
  render() {
    return `<section class="hero" style="height:220px">${heroSVG(moment())}</section>
    <div style="padding:0 20px calc(var(--safe-b) + 32px);margin-top:-12px;position:relative">
      <h1 class="h1" style="font-size:38px">Calmo</h1>
      <p class="sub">Ejercicios de respiración por la nariz para toda la familia. Empecemos por saber quién respira en este teléfono.</p>
      <form id="setup" class="stack" style="margin-top:20px" novalidate>
        <label class="stack" style="gap:6px"><span class="muted">Nombre de la familia (opcional)</span>
          <input class="field" name="family" maxlength="32" autocomplete="off" placeholder="Familia"></label>
        <p class="label" style="margin-bottom:0">Personas</p>
        <div id="people" class="stack">${personRow(0)}</div>
        <button type="button" class="btn block" id="add">${icon('plus', 18)} Agregar persona</button>
        <p class="muted" style="margin:0">Las niñas y los niños no necesitan teléfono propio: entran a su perfil desde aquí con un toque.</p>
        <label class="row tile" style="cursor:pointer">
          <input type="checkbox" name="routines" checked style="width:22px;height:22px;accent-color:var(--sage)">
          <span style="font-size:14px;line-height:1.45">Agregar rutinas sugeridas: adultos a las 05:30 y 21:00, niñas y niños antes de dormir. Las puedes cambiar después.</span>
        </label>
        <p id="err" role="alert" style="margin:0;color:var(--brasa);font-size:14px;min-height:20px"></p>
        <button class="btn primary block" type="submit">${icon('leaf', 18)} Empezar</button>
        <p class="muted" style="margin:0;text-align:center">Tus datos se guardan en este teléfono. Nadie más los ve.</p>
      </form>
    </div>`;
  },
  mount(root, ctx) {
    const people = root.querySelector('#people');
    const form = root.querySelector('#setup');
    const err = root.querySelector('#err');
    let next = 1;

    const setKind = (row, kind) => row.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));

    root.querySelector('#add').addEventListener('click', () => {
      people.insertAdjacentHTML('beforeend', personRow(next++, 'junior'));
      people.lastElementChild.querySelector('[name="name"]').focus();
    });
    people.addEventListener('click', (e) => {
      const row = e.target.closest('[data-person]');
      if (!row) return;
      const k = e.target.closest('[data-kind]');
      if (k) setKind(row, k.dataset.kind);
      if (e.target.closest('[data-remove]')) row.remove();
    });
    people.addEventListener('input', (e) => {
      err.textContent = '';
      if (e.target.name !== 'age') return;
      const kind = kindForAge(Number(e.target.value));
      if (kind) setKind(e.target.closest('[data-person]'), kind);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const list = [...people.querySelectorAll('[data-person]')].map((row) => ({
        name: row.querySelector('[name="name"]').value.trim(),
        age: row.querySelector('[name="age"]').value,
        kind: row.querySelector('[data-kind][aria-pressed="true"]')?.dataset.kind || 'adulto',
      })).filter((x) => x.name);
      if (!list.length) { err.textContent = 'Escribe al menos tu nombre.'; return; }
      if (!list.some((x) => x.kind === 'adulto')) { err.textContent = 'Hace falta al menos un adulto.'; return; }
      ctx.store.setupFamily({ family: form.family.value, people: list, withRoutines: form.routines.checked });
      ctx.go('inicio');
    });
  },
};

export { esc };
