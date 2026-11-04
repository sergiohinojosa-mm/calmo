// Arranque y navegación por hash: #/pantalla/param?clave=valor
// Cada pantalla vive en js/screens/<nombre>.js y exporta por defecto
// { tab?, full?, render(ctx) => html, mount?(root, ctx) => cleanup }.

// Compatibilidad con iPhones con iOS anterior al 15.4.
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value(n) { let i = Math.trunc(n) || 0; if (i < 0) i += this.length; return this[i]; },
    configurable: true,
    writable: true,
  });
}

import * as store from './store.js';
import { icon, esc } from './ui.js';
import { unlock } from './audio.js';
import * as sync from './sync.js';

// Fuentes sin frenar la primera pantalla (en claude.ai ya vienen en la página).
if (!document.querySelector('link[href*="fonts.googleapis.com/css2"]')) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Fraunces:opsz,wght,SOFT@9..144,300..600,0..100&display=swap';
  document.head.appendChild(fonts);
}

// iOS solo permite iniciar el audio dentro de un toque: los botones que abren
// una sesión llevan data-audio y desbloquean el sonido en ese mismo toque.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-audio]')) unlock();
}, true);

const view = document.getElementById('view');
const tabs = document.getElementById('tabs');
const app = document.getElementById('app');
let cleanup = null;
let renderToken = 0;

export function go(path) {
  const next = '#/' + path.replace(/^#?\/?/, '');
  if (location.hash === next) render();
  else location.hash = next;
}

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const [name, ...params] = path.split('/').filter(Boolean);
  return { name: name || 'inicio', params: params.map(decodeURIComponent), query: new URLSearchParams(qs) };
}

const TABS = {
  adulto: [
    ['inicio', 'Inicio', 'home'],
    ['calendario', 'Calendario', 'cal'],
    ['progreso', 'Progreso', 'chart'],
    ['perfil', 'Mi perfil', 'user'],
    ['familia', 'Familia', 'users'],
  ],
  junior: [
    ['inicio', 'Inicio', 'home'],
    ['logros', 'Logros', 'star'],
    ['perfil', 'Mi perfil', 'user'],
    ['familia', 'Familia', 'users'],
  ],
  peque: [],
  // La maestra: sus alumnos, asignar prácticas, su propia práctica y su cuenta.
  maestra: [
    ['alumnos', 'Alumnos', 'users'],
    ['asignar', 'Asignar', 'plus'],
    ['inicio', 'Mi práctica', 'leaf'],
    ['ajustes', 'Cuenta', 'gear'],
  ],
};

function drawTabs(active) {
  const p = store.profile();
  const list = sync.isTeacher() ? TABS.maestra : (p && TABS[p.kind]) || [];
  tabs.innerHTML = list.map(([route, label, ic]) =>
    `<a href="#/${route}" ${route === active ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${esc(label)}</span></a>`).join('');
}

let shownRoute = null;
let navigated = false;
// Pantallas que puede abrir un perfil Peque; cualquier otra dirección la regresa a su inicio.
const PEQUE_SCREENS = new Set(['inicio', 'sesion', 'resumen', 'bolt', 'premios', 'perfil', 'cambiar', 'logros']);
// La maestra no cambia de perfil, no administra la familia ni los premios.
const TEACHER_SCREENS = new Set(['alumnos', 'alumno', 'asignar', 'planear', 'calendario', 'inicio', 'catalogo', 'configurar', 'sesion', 'resumen', 'bolt', 'serie', 'progreso', 'logros', 'consejos', 'ajustes', 'usuarios', 'perfil']);

async function render() {
  const token = ++renderToken;
  const parsed = parse();
  const { params, query } = parsed;
  // Con servidor de la familia, primero se entra con usuario y contraseña;
  // sin familia configurada todavía, la app abre la bienvenida.
  let name = parsed.name;
  if (sync.enabled() && !sync.session()) name = 'ingresar';
  else if (sync.isTeacher()) {
    if (store.profile()?.role !== 'maestra') store.ensureTeacher(sync.session().usuario.nombre);
    if (!TEACHER_SCREENS.has(name)) name = 'alumnos';
  } else if (!store.profiles().length) name = 'bienvenida';
  // El tablero de la maestra es solo suyo.
  else if (['alumnos', 'alumno', 'asignar'].includes(name)) name = 'inicio';
  else if (store.profile()?.kind === 'peque' && !PEQUE_SCREENS.has(name)) name = 'inicio';
  let mod;
  try {
    mod = (await import(`./screens/${name}.js`)).default;
  } catch (e) {
    console.error(e);
    mod = (await import('./screens/inicio.js')).default;
  }
  if (token !== renderToken) return;
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
  cleanup = null;
  const ctx = { name, params, query, store, go, rerender: render, profile: store.profile() };
  const noTabs = mod.full || !ctx.profile || (ctx.profile.kind === 'peque' && !sync.isTeacher()) || mod.tab === false;
  app.classList.toggle('no-tabs', !!noTabs);
  view.className = 'view' + (mod.full ? ' full' : '');
  // Al volver a dibujar la misma pantalla (cambiar una meta, elegir un día, filtrar,
  // llegar datos de otro teléfono) se queda donde estaba; solo sube al cambiar de pantalla.
  const route = [name, ...params].join('/');
  const keepY = route === shownRoute ? window.scrollY : 0;
  view.innerHTML = mod.render(ctx);
  drawTabs(mod.tab || name);
  const changed = route !== shownRoute;
  shownRoute = route;
  const h1 = view.querySelector('h1');
  const heading = h1 ? (h1.innerText || h1.textContent).replace(/\s+/g, ' ').trim() : '';
  document.title = heading ? `${heading} · Calmo` : 'Calmo';
  if (changed && h1 && navigated) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  window.scrollTo(0, keepY);
  if (mod.mount) cleanup = mod.mount(view, ctx) || null;
}

window.addEventListener('hashchange', render);

// «Volver» regresa a donde estabas (si llegaste navegando dentro de la app); si no, a su destino fijo.
window.addEventListener('hashchange', () => { navigated = true; });
document.addEventListener('click', (e) => {
  const back = e.target.closest('a[aria-label="Volver"]');
  if (!back || !navigated || e.defaultPrevented) return;
  e.preventDefault();
  history.back();
});
render().then(prefetch);
sync.pull();

// Carga por adelantado las pantallas de las pestañas para que abran al instante.
function prefetch() {
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  later(() => {
    ['calendario', 'progreso', 'perfil', 'familia', 'logros', 'configurar', 'sesion', 'resumen']
      .forEach((s) => import(`./screens/${s}.js`).catch(() => {}));
  });
}

const LIVE = new Set(['sesion', 'bolt', 'serie', 'planear', 'asignar', 'perfiles', 'cambiar', 'ingresar', 'usuarios', 'bienvenida']);
// Mientras alguien escribe (un mensaje, una nota), lo que llega de otro teléfono no
// redibuja la pantalla, para no borrarle el texto ni cerrarle el teclado: se ve al salir del campo.
const typing = () => {
  const a = document.activeElement;
  return !!a && view.contains(a) && a.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=range])');
};
let staleView = false;
store.onRemote(() => {
  if (LIVE.has(parse().name)) return;
  if (typing()) staleView = true;
  else render();
});
// Se espera un momento para que el toque en «Enviar» llegue antes de redibujar.
view.addEventListener('focusout', () => {
  if (!staleView) return;
  setTimeout(() => { if (staleView && !typing()) { staleView = false; render(); } }, 400);
});
window.addEventListener('hashchange', () => { staleView = false; });

if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
  // Cuando llega una versión nueva, la app se recarga sola una vez para usarla,
  // pero nunca a la mitad de una sesión de respiración: espera a que termine.
  let hadController = !!navigator.serviceWorker.controller;
  let pendingReload = false;
  // Ocupado: una sesión, un reto o un formulario a medias. La recarga espera a que salga de ahí.
  const busy = () => document.body.dataset.session === 'on' || LIVE.has(parse().name);
  const reloadNow = () => { if (pendingReload && !busy()) { pendingReload = false; location.reload(); } };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // La primera vez que el service worker toma el control no hay versión nueva que aplicar.
    if (!hadController) { hadController = true; return; }
    pendingReload = true;
    reloadNow();
  });
  window.addEventListener('hashchange', reloadNow);
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Al volver a la app, revisar si hay versión nueva.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
