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
};

function drawTabs(active) {
  const p = store.profile();
  const list = (p && TABS[p.kind]) || [];
  tabs.innerHTML = list.map(([route, label, ic]) =>
    `<a href="#/${route}" ${route === active ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${esc(label)}</span></a>`).join('');
}

let shownHash = null;

async function render() {
  const token = ++renderToken;
  const parsed = parse();
  const { params, query } = parsed;
  // Con servidor de la familia, primero se entra con usuario y contraseña;
  // sin familia configurada todavía, la app abre la bienvenida.
  let name = parsed.name;
  if (sync.enabled() && !sync.session()) name = 'ingresar';
  else if (!store.profiles().length) name = 'bienvenida';
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
  const noTabs = mod.full || !ctx.profile || ctx.profile.kind === 'peque' || mod.tab === false;
  app.classList.toggle('no-tabs', !!noTabs);
  view.className = 'view' + (mod.full ? ' full' : '');
  // Al volver a dibujar la misma pantalla (cambiar una meta, pausar una rutina,
  // llegar datos de otro teléfono) se queda donde estaba; solo sube al cambiar de pantalla.
  const keepY = location.hash === shownHash ? window.scrollY : 0;
  view.innerHTML = mod.render(ctx);
  drawTabs(mod.tab || name);
  shownHash = location.hash;
  window.scrollTo(0, keepY);
  if (mod.mount) cleanup = mod.mount(view, ctx) || null;
}

window.addEventListener('hashchange', render);
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

const LIVE = new Set(['sesion', 'bolt', 'pasos', 'serie', 'planear', 'perfiles', 'cambiar', 'ingresar', 'usuarios', 'bienvenida']);
store.onRemote(() => { if (!LIVE.has(parse().name)) render(); });

if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
