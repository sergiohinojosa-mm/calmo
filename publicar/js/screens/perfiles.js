// Administrar perfiles de la familia (solo adultos administradores).

import { esc, icon, toast, avatar, askConfirm } from '../ui.js';

const KINDS = [['adulto', 'Adulto'], ['junior', 'Junior'], ['peque', 'Peque']];

function kindSeg(name, selected) {
  return `<div class="seg" role="group" aria-label="Tipo de perfil" data-seg="${name}">
    ${KINDS.map(([k, label]) => `<button type="button" data-kind="${k}" aria-pressed="${k === selected}">${label}</button>`).join('')}</div>`;
}

// Solo para adultos: el administrador cambia perfiles, metas y rutinas de todos.
function adminRow(on, kind) {
  return `<div class="between" data-admin-row style="gap:12px;${kind === 'adulto' ? '' : 'display:none'}">
    <span style="min-width:0"><span style="display:block;font-size:15px">Administrador</span><span class="muted">Cambia perfiles, metas y rutinas de todos</span></span>
    <button type="button" class="switch" role="switch" aria-checked="${!!on}" aria-label="Administrador" data-admin><span></span></button></div>`;
}

export default {
  tab: 'familia',
  render(ctx) {
    const { store } = ctx;
    const me = ctx.profile;
    if (me.kind !== 'adulto' || !me.admin) {
      return `<div class="top"><a class="icon-btn" href="#/familia" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Perfiles</h1></div>
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
        ${p.id === me.id ? '' : adminRow(p.admin, p.kind)}
        ${p.kind === 'adulto' && p.id !== me.id && store.hasPin(p.id) ? `<div class="between" style="gap:12px"><span class="muted row" style="gap:6px">${icon('lock', 14)} Tiene PIN</span><button type="button" class="btn small" data-clear-pin>Quitar PIN</button></div>` : ''}
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:13px;min-height:16px"></p>
        <button class="btn small" type="submit">Guardar cambios</button>
      </form>`).join('');

    const back = ctx.query.get('de') === 'ajustes' ? '#/ajustes' : '#/familia';
    return `<div class="top"><a class="icon-btn" href="${back}" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Familia</h1></div>
      <p class="sub" style="margin-top:0">Quién respira en este teléfono. Las niñas no necesitan cuenta propia.</p>
      <div class="stack" style="margin-top:16px">${list}</div>

      <p class="label" id="nuevo">Agregar a alguien</p>
      <form class="card stack" id="add" novalidate>
        <div class="grid2">
          <label class="stack" style="gap:6px"><span class="muted">Nombre</span><input class="field" name="name" maxlength="24" placeholder="Nombre" required></label>
          <label class="stack" style="gap:6px"><span class="muted">Edad</span><input class="field" name="age" type="number" inputmode="numeric" min="1" max="99" placeholder="9"></label>
        </div>
        ${kindSeg('kind', 'junior')}
        ${adminRow(true, 'junior')}
        <p class="muted" style="margin:0">Peque hasta 6 años · Junior de 7 a 15 · Adulto desde 16.</p>
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:13px;min-height:16px"></p>
        <button class="btn primary block" type="submit">${icon('plus', 18)} Agregar perfil</button>
      </form>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const picked = new Map();

    // El interruptor de administrador solo aparece para adultos; al volverse adulto queda encendido.
    const pick = (seg, k) => {
      const was = picked.get(seg);
      picked.set(seg, k);
      seg.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.kind === k)));
      const row = seg.closest('form').querySelector('[data-admin-row]');
      if (!row) return;
      row.style.display = k === 'adulto' ? '' : 'none';
      if (k === 'adulto' && was && was !== 'adulto') row.querySelector('[data-admin]').setAttribute('aria-checked', 'true');
    };
    root.querySelectorAll('[data-seg]').forEach((seg) => {
      picked.set(seg, seg.querySelector('[aria-pressed="true"]')?.dataset.kind);
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-kind]');
        if (b) pick(seg, b.dataset.kind);
      });
    });
    root.querySelectorAll('[data-admin]').forEach((sw) => sw.addEventListener('click', () => {
      sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
    }));

    // Sugerir el tipo al escribir la edad en el alta.
    const add = root.querySelector('#add');
    if (ctx.query.get('nuevo') && add) {
      root.querySelector('#nuevo').scrollIntoView({ block: 'start' });
      add.elements.namedItem('name').focus({ preventScroll: true });
    }
    add?.elements.namedItem('age').addEventListener('input', (e) => {
      const k = store.kindForAge(e.target.value);
      if (k) pick(add.querySelector('[data-seg]'), k);
    });

    const kindOf = (form, fallback) => picked.get(form.querySelector('[data-seg]')) || fallback;
    const adminOf = (form, kind) => {
      const sw = form.querySelector('[data-admin]');
      return kind === 'adulto' && sw ? sw.getAttribute('aria-checked') === 'true' : undefined;
    };

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
        const admin = adminOf(form, kind);
        store.updateProfile(id, { name, kind, age: form.elements.namedItem('age').value, ...(admin === undefined ? {} : { admin }) });
        toast('Perfil guardado');
        rerender();
      });
      form.querySelector('[data-clear-pin]')?.addEventListener('click', () => {
        const p = store.profile(id);
        askConfirm(`¿Quitar el PIN de ${p.name}? Podrá entrar sin PIN hasta que cree uno nuevo en Ajustes.`, { ok: 'Quitar PIN' }).then((ok) => {
          if (!ok) return;
          store.clearPin(id);
          toast(`${p.name} ya no tiene PIN`);
          rerender();
        });
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
      const kind = kindOf(add, store.kindForAge(age) || 'junior');
      const p = store.addProfile({ name, kind, age, admin: adminOf(add, kind) ?? false });
      toast(`Listo: ${p.name} ya puede respirar en este teléfono`);
      if (ctx.query.get('nuevo')) ctx.go('familia'); else rerender();
    });
  },
};
