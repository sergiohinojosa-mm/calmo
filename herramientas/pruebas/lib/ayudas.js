// Ayudas para armar escenarios con el store real. Importa el entorno primero.
import { reloj } from './entorno.js';
import * as store from '../../../web/js/store.js';

export { store };

export const clon = (x) => JSON.parse(JSON.stringify(x));
// Estado completo (incluye el libro de hojas y los borrados), tal como se respalda.
export const datos = () => JSON.parse(store.exportJSON());

export const GENTE = [
  { name: 'Sergio', kind: 'adulto', age: 40 },
  { name: 'Marcela', kind: 'adulto', age: 38 },
  { name: 'Ana', kind: 'junior', age: 10 },
  { name: 'Lía', kind: 'peque', age: 5 },
];

export const porNombre = () => Object.fromEntries(store.profiles().map((p) => [p.name, p]));

// Teléfono limpio con una familia nueva, el lunes 1 de junio de 2026 a las 8:00.
export function nuevaFamilia({ conRutinas = false, gente = GENTE, dia = [2026, 6, 1, 8, 0] } = {}) {
  store.resetAll();
  reloj.fijar(...dia);
  store.setupFamily({ family: 'Prueba', people: gente, withRoutines: conRutinas });
  return porNombre();
}

// Sesión del perfil activo que empieza en `cuando` y dura `min` minutos.
export const sesion = (exerciseId, cuando, min = 10, extra = {}) =>
  store.addSession({ exerciseId, startedAt: cuando, durationSec: min * 60, ...extra });

// Hace algo como otra persona y regresa al perfil anterior.
export function como(id, fn) {
  const antes = store.profile()?.id;
  store.setCurrent(id);
  try { return fn(); } finally { if (antes) store.setCurrent(antes); }
}

// Registros que apuntan a una persona (para revisar huérfanos o borrados).
export const registrosDe = (d, id) => ['routines', 'sessions', 'bolt', 'steps', 'ledger', 'redemptions', 'notes']
  .flatMap((k) => (d[k] || []).filter((x) => x.profile === id).map((x) => `${k}:${x.id || x.reason}`));

export const hojasPorInsignia = (id) => datos().ledger.filter((l) => l.profile === id && l.reason === 'insignia').length;
