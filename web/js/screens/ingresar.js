// Ingreso con usuario y contraseña. La primera vez se crea la cuenta de administrador.

import { esc, icon, moment } from '../ui.js';
import { heroSVG } from '../hero.js';
import * as sync from '../sync.js';

const field = (name, label, type = 'text', extra = '') =>
  `<label class="stack" style="gap:6px"><span class="muted">${label}</span><input class="field" name="${name}" type="${type}" ${extra}></label>`;

export default {
  full: true,
  render() {
    return `<section class="hero" style="height:200px">${heroSVG(moment())}</section>
    <div style="padding:0 20px calc(var(--safe-b) + 32px);margin-top:-12px;position:relative">
      <h1 class="h1" style="font-size:38px">Calmo</h1>
      <p class="sub" id="lead">Conectando…</p>
      <form id="login" class="stack" style="margin-top:20px;display:none" novalidate>
        ${field('usuario', 'Usuario', 'text', 'autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required')}
        ${field('password', 'Contraseña', 'password', 'autocomplete="current-password" required')}
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:14px;min-height:20px"></p>
        <button class="btn primary block" type="submit">${icon('lock', 18)} Entrar</button>
        <p class="muted" style="margin:0;text-align:center">¿Olvidaste tu contraseña? Pídele a quien administra la familia que te asigne una nueva.</p>
      </form>
      <form id="admin" class="stack" style="margin-top:20px;display:none" novalidate>
        <div class="tile"><p style="margin:0;font-size:14px;line-height:1.5">Es la primera vez que se usa Calmo con este servidor. Crea la cuenta de administrador; después das de alta a los demás desde Ajustes.</p></div>
        ${field('nombre', 'Tu nombre', 'text', 'autocomplete="name" required')}
        ${field('usuario', 'Usuario', 'text', 'autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required')}
        ${field('password', 'Contraseña (mínimo 6 caracteres)', 'password', 'autocomplete="new-password" required')}
        ${field('password2', 'Repite la contraseña', 'password', 'autocomplete="new-password" required')}
        <p class="err" role="alert" style="margin:0;color:var(--brasa);font-size:14px;min-height:20px"></p>
        <button class="btn primary block" type="submit">${icon('check', 18)} Crear cuenta y entrar</button>
      </form>
    </div>`;
  },
  mount(root, ctx) {
    const login = root.querySelector('#login');
    const admin = root.querySelector('#admin');
    const busy = (form, on) => form.querySelector('[type="submit"]').setAttribute('aria-disabled', String(on));

    sync.hasUsers().then((has) => {
      const lead = root.querySelector('#lead');
      if (has === false) {
        admin.style.display = '';
        lead.textContent = 'Bienvenido. Configuremos tu familia.';
      } else {
        login.style.display = '';
        lead.textContent = has === null ? 'Sin conexión con el servidor. Revisa tu internet e intenta entrar.' : 'Entra con tu usuario y contraseña.';
      }
    });

    root.querySelectorAll('form').forEach((f) => f.addEventListener('input', () => { f.querySelector('.err').textContent = ''; }));

    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = login.querySelector('.err');
      if (!login.usuario.value.trim() || !login.password.value) { err.textContent = 'Escribe tu usuario y tu contraseña.'; return; }
      busy(login, true);
      const r = await sync.login(login.usuario.value, login.password.value);
      busy(login, false);
      if (!r.ok) { err.textContent = r.error; return; }
      ctx.go('inicio');
    });

    admin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = admin.querySelector('.err');
      if (!admin.nombre.value.trim() || !admin.usuario.value.trim()) { err.textContent = 'Escribe tu nombre y un usuario.'; return; }
      if (admin.password.value.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
      if (admin.password.value !== admin.password2.value) { err.textContent = 'Las contraseñas no coinciden.'; return; }
      busy(admin, true);
      const r = await sync.createAdmin(admin.nombre.value, admin.usuario.value, admin.password.value);
      busy(admin, false);
      if (!r.ok) { err.textContent = r.error; return; }
      ctx.go('inicio');
    });
  },
};

export { esc };
