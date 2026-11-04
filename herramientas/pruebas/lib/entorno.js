// Entorno mínimo de navegador para correr los módulos reales de Calmo en JavaScriptCore.
// Se importa ANTES que cualquier módulo de la app: store.js lee localStorage y window al cargarse.
// Todo es determinista: el reloj solo avanza cuando la prueba lo pide y Math.random tiene semilla.

const g = globalThis;

// ---------- Reloj controlable ----------
const RealDate = Date;
const BASE = new RealDate(2026, 5, 1, 8, 0, 0, 0).getTime(); // lunes 1 de junio de 2026, 8:00 local

export const reloj = {
  ahora: BASE,
  // Mes en base 1 para leer fácil: fijar(2026, 6, 1, 8, 0) = 1 de junio a las 8:00.
  fijar(y, m, d, h = 0, min = 0) { this.ahora = new RealDate(y, m - 1, d, h, min, 0, 0).getTime(); return this.fecha(); },
  en(fecha) { this.ahora = new RealDate(fecha).getTime(); return this.fecha(); },
  avanzar(ms) { this.ahora += ms; return this.fecha(); },
  avanzarMin(n) { return this.avanzar(n * 60000); },
  // Mismo reloj de pared, n días después (sin depender de husos ni horario de verano).
  avanzarDias(n) { const d = new RealDate(this.ahora); d.setDate(d.getDate() + n); this.ahora = d.getTime(); return this.fecha(); },
  fecha() { return new RealDate(this.ahora); },
};

// Fecha local exacta, sin tocar el reloj: fecha(2026, 6, 1, 7, 30).
export const fecha = (y, m, d, h = 0, min = 0) => new RealDate(y, m - 1, d, h, min, 0, 0);

function FakeDate(...args) {
  if (!new.target) return new RealDate(reloj.ahora).toString();
  return args.length ? new RealDate(...args) : new RealDate(reloj.ahora);
}
FakeDate.prototype = RealDate.prototype;
FakeDate.now = () => reloj.ahora;
FakeDate.parse = RealDate.parse;
FakeDate.UTC = RealDate.UTC;
g.Date = FakeDate;

// ---------- Azar con semilla ----------
let semilla = 20260601;
Math.random = () => {
  // mulberry32
  semilla = (semilla + 0x6D2B79F5) | 0;
  let t = semilla;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------- Temporizadores: no corren solos ----------
const cola = new Map();
let siguiente = 1;
export const temporizadores = {
  pendientes: () => cola.size,
  correr() { const fns = [...cola.values()]; cola.clear(); fns.forEach((f) => f()); return fns.length; },
};
g.setTimeout = (fn, ms = 0) => { const id = siguiente++; cola.set(id, () => fn()); return id; };
g.clearTimeout = (id) => { cola.delete(id); };
g.setInterval = () => 0;
g.clearInterval = () => {};
g.requestAnimationFrame = (fn) => g.setTimeout(() => fn(reloj.ahora), 16);
g.cancelAnimationFrame = (id) => g.clearTimeout(id);

// ---------- localStorage en memoria ----------
class Memoria {
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(String(k)) ? this.m.get(String(k)) : null; }
  setItem(k, v) { this.m.set(String(k), String(v)); }
  removeItem(k) { this.m.delete(String(k)); }
  clear() { this.m.clear(); }
}
g.localStorage = new Memoria();
g.sessionStorage = new Memoria();

// ---------- window, document y navigator: solo lo que se toca ----------
const nada = () => {};
const elemento = () => ({
  style: {}, dataset: {}, className: '', textContent: '', innerHTML: '',
  setAttribute: nada, getAttribute: () => null, appendChild: nada, remove: nada,
  addEventListener: nada, removeEventListener: nada, querySelector: () => null, querySelectorAll: () => [], focus: nada,
});
// Sin window.claude: store.js no intenta conectarse a la nube de claude.ai.
g.window = { location: { hash: '', href: 'http://localhost/', search: '' }, addEventListener: nada, removeEventListener: nada, matchMedia: () => ({ matches: false, addEventListener: nada }) };
g.document = { body: elemento(), documentElement: elemento(), createElement: elemento, querySelector: () => null, querySelectorAll: () => [], addEventListener: nada, removeEventListener: nada, visibilityState: 'visible' };
export const persistencia = { pedidas: 0 };
g.navigator = { userAgent: 'jsc-pruebas', language: 'es-MX', onLine: true, storage: { persist: () => { persistencia.pedidas++; return Promise.resolve(true); } } };

// jsc no trae console.
if (typeof g.console === 'undefined') {
  const out = (...a) => print(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  g.console = { log: out, info: out, warn: out, error: out, debug: nada };
}
