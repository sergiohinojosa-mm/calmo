// Administrar perfiles de la familia (solo adultos administradores).

import { esc, icon, toast, avatar, askConfirm } from '../ui.js';

const KINDS = [['adulto', 'Adulto'], ['junior', 'Junior'], ['peque', 'Peque']];

// Edad sugerida → tipo de perfil: Peque hasta 7 años, Junior de 8 a 15.
const kindForAge = (age) => (age && age <= 7 ? 'peque' : age && age <= 15 ? 'junior' : 'adulto');

function kindSeg(name, selected) {
  return `<div class="seg" role="group" aria-label="Tipo de perfil" data-seg="${name}">
    ${KINDS.map(([k, label]) => `<button type="button" data-kind="${k}" aria-pressed="${k === selected}">${label}</button>`).join('')}</div>`;
}

export default {
  tab: 'perfil',
  render(ctx) {
    const { store } = ctx;
    const me = ctx.profile;
    if (me.kind !== 'adulto' || !me.admin) {
      return `<div class="top"><a class="icon-btn" href="#/perfil" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Perfiles</h1></div>
        <p class="sub">Solo papá o mamá pueden cambiar los perfiles.</p>`;
    }
    const list = store.profiles().map((p) => `<form class="card stack" data-id="${esc(p.id)}" novalidate>
        <div class="row">${avatar(p, 48)}<span style="flex:1;min-width:0;font-weight:600">${esc(p.name)}${p.id === me.id ? ' <span class="muted">(tú)</span>' : ''}</span>
          ${p.id === me.id ? '' : `<button type="button" class="icon-btn" data-del style="background:transparent;color:var(--muted)" aria-label="Quitar a ${esc(p.name)}">${icon('trash', 18)}</button>`}</div>
        <div class="grid2">
          <label class="stack" style="gap:6px"><span class="muted">Nombre</span><input class="field" name="name" value="${esc(p.name)}" maxlength="24" required></label>
          <label class="stack" style="gap:6px"><span class="muted">Edad</span><input class="field" name="age" type="number" inputmode="numeric" min="1" max="99" value="${p.age || ''}" placeholder="—"></label>
        </div>
        ${kindSeg('kind', p.kind)}
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:13px;min-height:16px"></p>
        <button class="btn small" type="submit">Guardar cambios</button>
      </form>`).join('');

    return `<div class="top"><a class="icon-btn" href="#/ajustes" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Perfiles</h1></div>
      <p class="sub" style="margin-top:0">Quién respira en este teléfono. Las niñas no necesitan cuenta propia.</p>
      <div class="stack" style="margin-top:16px">${list}</div>

      <p class="label">Agregar a alguien</p>
      <form class="card stack" id="add" novalidate>
        <div class="grid2">
          <label class="stack" style="gap:6px"><span class="muted">Nombre</span><input class="field" name="name" maxlength="24" placeholder="Nombre" required></label>
          <label class="stack" style="gap:6px"><span class="muted">Edad</span><input class="field" name="age" type="number" inputmode="numeric" min="1" max="99" placeholder="9"></label>
        </div>
        ${kindSeg('kind', 'junior')}
        <p class="muted" style="margin:0">Peque hasta 7 años · Junior de 8 a 15 · Adulto desde 16.</p>
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:13px;min-height:16px"></p>
        <button class="btn primary block" type="submit">${icon('plus', 18)} Agregar perfil</button>
      </form>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const picked = new Map();

    root.querySelectorAll('[data-seg]').forEach((seg) => seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]');
      if (!b) return;
      picked.set(seg, b.dataset.kind);
      seg.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));

    // Sugerir el tipo al escribir la edad en el alta.
    const add = root.querySelector('#add');
    add?.elements.namedItem('age').addEventListener('input', (e) => {
      const seg = add.querySelector('[data-seg]');
      const k = kindForAge(Number(e.target.value));
      picked.set(seg, k);
      seg.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.kind === k)));
    });

    const kindOf = (form, fallback) => picked.get(form.querySelector('[data-seg]')) || fallback;

    root.querySelectorAll('form[data-id]').forEach((form) => {
      const id = form.dataset.id;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = form.elements.namedItem('name').value.trim();
        if (!name) { form.querySelector('.err').textContent = 'Escribe un nombre.'; return; }
        const current = store.profile(id);
        const kind = kindOf(form, current.kind);
        const adults = store.profiles().filter((p) => p.kind === 'adulto');
        if (current.kind === 'adulto' && kind !== 'adulto' && adults.length <= 1) {
          form.querySelector('.err').textContent = 'Tiene que quedar al menos un adulto.';
          return;
        }
        store.updateProfile(id, { name, kind, age: form.elements.namedItem('age').value });
        toast('Perfil guardado');
        rerender();
      });
      form.querySelector('[data-del]')?.addEventListener('click', () => {
        const p = store.profile(id);
        askConfirm(`¿Quitar a ${p.name}? Se borran sus sesiones, mediciones y rutinas.`, { ok: 'Quitar' }).then((ok) => {
          if (!ok) return;
          if (store.removeProfile(id)) { toast(`${p.name} ya no está en la familia`); rerender(); }
          else form.querySelector('.err').textContent = 'Tiene que quedar al menos un adulto.';
        });
      });
    });

    add?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = add.elements.namedItem('name').value.trim();
      if (!name) { add.querySelector('.err').textContent = 'Escribe un nombre.'; return; }
      const age = add.elements.namedItem('age').value;
      const p = store.addProfile({ name, kind: kindOf(add, age ? kindForAge(Number(age)) : 'junior'), age });
      toast(`Listo: ${p.name} ya puede respirar en este teléfono`);
      rerender();
    });
  },
};
