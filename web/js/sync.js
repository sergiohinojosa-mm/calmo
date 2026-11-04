// Ingreso con usuario y contraseña y sincronización con el servidor de la familia.
// Los cambios se guardan primero en el teléfono y se envían en cuanto hay internet.

import { API_URL } from './config.js';
import * as store from './store.js';

const SESSION_KEY = 'calmo.sesion';
const BASE_KEY = 'calmo.base';

export const enabled = () => !!API_URL && !(window.claude && window.claude.use);

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* almacenamiento bloqueado */ }
}

export const session = () => read(SESSION_KEY);
export const isAdmin = () => session()?.usuario?.rol === 'admin';
export const isTeacher = () => enabled() && session()?.usuario?.rol === 'maestra';

export async function api(action, payload = {}) {
  const s = session();
  let res;
  try {
    // text/plain evita la verificación previa de CORS que Apps Script no responde.
    const body = JSON.stringify({ action, token: s?.token, ...payload });
    // keepalive deja terminar el envío aunque se cierre la app (el navegador lo limita a 64 KB).
    res = await fetch(API_URL, { method: 'POST', body, keepalive: body.length < 60000, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  } catch (e) {
    return { ok: false, offline: true, error: 'Sin conexión. Tus cambios se guardan en el teléfono.' };
  }
  let out;
  try { out = await res.json(); } catch (e) { return { ok: false, error: 'El servidor no respondió bien. Intenta de nuevo.' }; }
  if (out.sesion === false) write(SESSION_KEY, null);
  return out;
}

export async function hasUsers() {
  const r = await api('estado');
  return r.ok ? r.hayUsuarios : null;
}

async function start(out) {
  if (!out.ok) return out;
  write(SESSION_KEY, { token: out.token, usuario: out.usuario });
  write(BASE_KEY, 0);
  await pull();
  return out;
}

export const login = (usuario, password) => api('ingresar', { usuario, password }).then(start);
export const createAdmin = (nombre, usuario, password) => api('crearAdmin', { nombre, usuario, password }).then(start);

export async function logout() {
  await api('salir');
  write(SESSION_KEY, null);
  write(BASE_KEY, null);
}

// Trae lo del servidor y lo junta con lo de este teléfono.
export async function pull() {
  if (!enabled() || !session()) return;
  const r = await api('cargar');
  if (!r.ok) return;
  if (r.state) {
    store.mergeRemote(r.state);
    write(BASE_KEY, r.updatedAt);
  }
  // Solo se envía si este teléfono tiene algo que el servidor no (no reescribe la hoja cada 45 s).
  if (dirty || !r.state || store.differsFrom(r.state)) push(true);
}

let dirty = false;

let timer = null;
let sending = false;
let again = false;

export function push(now = false) {
  if (!enabled() || !session()) return;
  clearTimeout(timer);
  timer = setTimeout(send, now ? 0 : 1500);
}

async function send() {
  if (sending) { again = true; return; }
  sending = true;
  const snap = store.snapshot();
  const r = await api('guardar', { state: snap.state, updatedAt: snap.updatedAt || Date.now(), base: read(BASE_KEY) || 0 });
  sending = false;
  if (r.ok && r.conflict) {
    store.mergeRemote(r.state);
    write(BASE_KEY, r.updatedAt);
    again = true;
  } else if (r.ok) {
    write(BASE_KEY, r.updatedAt);
    dirty = false;
    // La maestra ve lo que el servidor aceptó, no lo que intentó cambiar sin permiso.
    if (r.state && isTeacher()) store.adoptServer(r.state, r.updatedAt);
  } else if (r.offline) {
    setTimeout(send, 60000);
  }
  if (again) { again = false; push(true); }
}

if (enabled()) {
  store.subscribe(() => { dirty = true; push(); });
  setInterval(() => { if (document.visibilityState === 'visible' && !sending) pull(); }, 45000);
  window.addEventListener('online', () => push(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
  // Al salir de la app (cambiar de app, bloquear el teléfono) se envía ya lo pendiente,
  // sin esperar los 1.5 s: así no queda nada sin subir hasta la próxima vez que se abra.
  const flush = () => { if (dirty && !sending) { clearTimeout(timer); send(); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}
