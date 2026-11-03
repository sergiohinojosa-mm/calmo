// Cuenta y usuarios: quién puede entrar a Calmo con usuario y contraseña.

import { esc, icon, toast, askConfirm } from '../ui.js';
import * as sync from '../sync.js';

const ROLES = { admin: 'Administrador', adulto: 'Adulto', maestra: 'Maestra' };

export default {
  tab: 'perfil',
  render() {
    const s = sync.session();
    if (!sync.enabled() || !s) {
      return `<div class="top"><a class="icon-btn" href="#/ajustes" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Cuenta</h1></div>
        <p class="sub">Esta versión funciona solo en este teléfono, sin ingreso.</p>`;
    }
    const admin = sync.isAdmin();
    return `<div class="top"><a class="icon-btn" href="#/ajustes" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Cuenta</h1></div>
      <div class="card row"><span style="flex:1"><span style="display:block;font-weight:600">${esc(s.usuario.nombre)}</span><span class="muted">Usuario: ${esc(s.usuario.usuario)} · ${ROLES[s.usuario.rol] || ''}</span></span>
        <button class="btn small" id="logout">Cerrar sesión</button></div>

      <p class="label">Cambiar mi contraseña</p>
      <form id="pass" class="card stack" novalidate>
        <label class="stack" style="gap:6px"><span class="muted">Contraseña actual</span><input class="field" name="actual" type="password" autocomplete="current-password"></label>
        <label class="stack" style="gap:6px"><span class="muted">Contraseña nueva (mínimo 6)</span><input class="field" name="nueva" type="password" autocomplete="new-password"></label>
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:14px;min-height:20px"></p>
        <button class="btn block" type="submit">Guardar contraseña</button>
      </form>

      ${admin ? `<p class="label">Quién puede entrar</p>
      <div id="list" class="stack"><p class="muted">Cargando…</p></div>
      <p class="label">Dar de alta o cambiar contraseña</p>
      <form id="user" class="card stack" novalidate>
        <label class="stack" style="gap:6px"><span class="muted">Nombre</span><input class="field" name="nombre" maxlength="32" autocomplete="off"></label>
        <label class="stack" style="gap:6px"><span class="muted">Usuario (sin espacios)</span><input class="field" name="usuario" maxlength="32" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off"></label>
        <div class="seg" role="group" aria-label="Rol">
          <button type="button" data-rol="adulto" aria-pressed="true">Adulto</button>
          <button type="button" data-rol="admin" aria-pressed="false">Administrador</button>
          <button type="button" data-rol="maestra" aria-pressed="false">Maestra</button>
        </div>
        <label class="stack" style="gap:6px"><span class="muted">Contraseña inicial (mínimo 6)</span><input class="field" name="password" type="password" autocomplete="new-password"></label>
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:14px;min-height:20px"></p>
        <button class="btn primary block" type="submit">${icon('plus', 18)} Guardar usuario</button>
        <p class="muted" style="margin:0">Compártele su usuario y contraseña en persona o por mensaje privado. Puede cambiarla al entrar.</p>
      </form>` : ''}`;
  },
  mount(root, ctx) {
    if (!sync.enabled() || !sync.session()) return null;
    root.querySelector('#logout').addEventListener('click', () => {
      askConfirm('¿Cerrar sesión en este teléfono? Tus datos quedan guardados en el servidor.', { ok: 'Cerrar sesión' }).then(async (ok) => {
        if (!ok) return;
        await sync.logout();
        ctx.go('ingresar');
      });
    });

    const pass = root.querySelector('#pass');
    pass.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = pass.querySelector('.err');
      if (pass.nueva.value.length < 6) { err.textContent = 'La contraseña nueva debe tener al menos 6 caracteres.'; return; }
      const r = await sync.api('cambiarClave', { actual: pass.actual.value, nueva: pass.nueva.value });
      if (!r.ok) { err.textContent = r.error; return; }
      pass.reset();
      toast('Contraseña actualizada');
    });

    if (!sync.isAdmin()) return null;
    const list = root.querySelector('#list');
    const draw = (users) => {
      list.innerHTML = users.map((u) => `<div class="tile row"><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(u.nombre)}</span><span class="muted">${esc(u.usuario)} · ${ROLES[u.rol] || u.rol}</span></span>
        ${u.usuario === sync.session().usuario.usuario ? '<span class="chip sage">Tú</span>' : `<button class="icon-btn" data-quitar="${esc(u.usuario)}" aria-label="Quitar a ${esc(u.nombre)}">${icon('trash', 18)}</button>`}</div>`).join('');
    };
    sync.api('usuarios').then((r) => { if (r.ok) draw(r.usuarios); else list.innerHTML = `<p class="muted">${esc(r.error)}</p>`; });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-quitar]');
      if (!b) return;
      askConfirm(`¿Quitarle el acceso a ${b.dataset.quitar}? Ya no podrá entrar.`, { ok: 'Quitar acceso' }).then(async (ok) => {
        if (!ok) return;
        const r = await sync.api('quitarUsuario', { usuario: b.dataset.quitar });
        if (r.ok) { draw(r.usuarios); toast('Acceso quitado'); } else toast(r.error);
      });
    });

    const form = root.querySelector('#user');
    let rol = 'adulto';
    form.querySelectorAll('[data-rol]').forEach((b) => b.addEventListener('click', () => {
      rol = b.dataset.rol;
      form.querySelectorAll('[data-rol]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    form.addEventListener('input', () => { form.querySelector('.err').textContent = ''; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.err');
      if (!form.nombre.value.trim() || !form.usuario.value.trim()) { err.textContent = 'Escribe nombre y usuario.'; return; }
      if (/\s/.test(form.usuario.value.trim())) { err.textContent = 'El usuario no lleva espacios.'; return; }
      const r = await sync.api('guardarUsuario', { nombre: form.nombre.value, usuario: form.usuario.value, rol, password: form.password.value });
      if (!r.ok) { err.textContent = r.error; return; }
      form.reset();
      draw(r.usuarios);
      toast('Usuario guardado');
    });
    return null;
  },
};
