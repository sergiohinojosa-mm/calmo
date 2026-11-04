// Guarda la app en el teléfono para que funcione sin internet.
// Sube VERSION y V (el mismo ?v= de index.html) cada vez que publiques cambios.
const VERSION = 'calmo-v18';
const V = '19';

const SCREENS = [
  'alumno', 'alumnos', 'asignar', 'ajustes', 'bienvenida', 'bolt', 'calendario', 'cambiar', 'catalogo', 'configurar', 'consejos',
  'familia', 'ingresar', 'inicio', 'logros', 'perfil', 'perfiles', 'planear', 'premios', 'premiosadmin', 'progreso',
  'resumen', 'serie', 'sesion', 'usuarios',
];

// Las mismas direcciones que pide index.html, más cada módulo y cada pantalla.
const PRECACHE = [
  './', 'index.html', 'manifest.webmanifest',
  `css/app.css?v=${V}`, `js/main.js?v=${V}`,
  'js/audio.js', 'js/catalog.js', 'js/config.js', 'js/hero.js', 'js/main.js', 'js/store.js', 'js/sync.js', 'js/ui.js',
  ...SCREENS.map((s) => `js/screens/${s}.js`),
  'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' evita copiar versiones viejas guardadas por el navegador.
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'calmo-fuentes').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Solo se guardan respuestas buenas: nunca un 404 ni un error.
function keep(req, res) {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Abrir la app: red primero, sin esperar más de 3 s; si no responde o responde con error
  // (por ejemplo, a la mitad de una publicación), la copia guardada.
  if (req.mode === 'navigate') {
    const saved = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'));
    e.respondWith(
      Promise.race([fetch(req).then((res) => (res.ok ? keep(req, res) : saved().then((r) => r || res))), timeout(3000)])
        .catch(saved),
    );
    return;
  }

  // Archivos de la app: la copia guardada al instante, y se actualiza en segundo plano.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => {
        const fresh = fetch(req).then((res) => keep(req, res)).catch(() => cached || Response.error());
        if (cached) e.waitUntil(fresh.then(() => {}, () => {}));
        return cached || fresh;
      }),
    );
    return;
  }

  // Fuentes de Google: se guardan la primera vez para usarlas sin internet.
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open('calmo-fuentes').then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      // La hoja de estilos de las fuentes llega opaca (sin CORS); también se guarda.
      if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {});
      return res;
    }))));
    return;
  }

  // Otros sitios: red y, si falla, lo guardado si existe.
  e.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || Response.error())));
});
