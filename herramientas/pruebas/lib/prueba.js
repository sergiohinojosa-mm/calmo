// Mini marco de pruebas para jsc (sin Node). Las pruebas se registran y corren en orden con fin().
//   prueba(nombre, fn)            debe pasar.
//   conocida(nombre, motivo, fn)  falla conocida de la app: se reporta, pero no rompe la suite.
//                                 Si un día pasa, avisa «ARREGLADA» para quitarle la marca.

const lista = [];
let grupoActual = '';

export const grupo = (nombre) => { grupoActual = nombre; };
export const prueba = (nombre, fn) => { lista.push({ grupo: grupoActual, nombre, fn }); };
export const conocida = (nombre, motivo, fn) => { lista.push({ grupo: grupoActual, nombre, fn, motivo }); };

class Falla extends Error {}

const fmt = (v) => {
  if (typeof v === 'string') return JSON.stringify(v);
  try { return JSON.stringify(v) ?? String(v); } catch (e) { return String(v); }
};
// JSON con llaves ordenadas para comparar estructuras.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
const pre = (msg) => (msg ? `${msg}: ` : '');

export function verdad(cond, msg) { if (!cond) throw new Falla(msg || 'se esperaba verdadero'); }
export function falso(cond, msg) { if (cond) throw new Falla(msg || 'se esperaba falso'); }
export function igual(real, esperado, msg) {
  if (!Object.is(real, esperado)) throw new Falla(`${pre(msg)}se esperaba ${fmt(esperado)} y llegó ${fmt(real)}`);
}
export function distinto(real, otro, msg) {
  if (Object.is(real, otro)) throw new Falla(`${pre(msg)}no debía ser ${fmt(otro)}`);
}
export function parecido(real, esperado, msg) {
  if (canon(real) !== canon(esperado)) throw new Falla(`${pre(msg)}se esperaba ${canon(esperado)} y llegó ${canon(real)}`);
}
export function incluye(lista_, x, msg) {
  if (!lista_ || !lista_.includes(x)) throw new Falla(`${pre(msg)}${fmt(x)} no está en ${fmt(lista_)}`);
}
export function noIncluye(lista_, x, msg) {
  if (lista_ && lista_.includes(x)) throw new Falla(`${pre(msg)}${fmt(x)} no debía estar en ${fmt(lista_)}`);
}
export function vacio(lista_, msg) {
  if (lista_ && lista_.length) throw new Falla(`${pre(msg)}se esperaba vacío y llegó ${fmt(lista_)}`);
}

// Dónde reventó un error inesperado (TypeError en la app, por ejemplo).
const donde = (e) => {
  const linea = String(e && e.stack || '').split('\n').find((l) => /\.js:\d+/.test(l));
  return linea ? ` (${linea.replace(/^.*?@/, '').replace(/^.*\/(web|herramientas)\//, '$1/')})` : '';
};

export async function fin(archivo) {
  let pasan = 0, fallan = 0, conocidas = 0, arregladas = 0, grupoVisto = null;
  for (const t of lista) {
    if (t.grupo !== grupoVisto) { print(`\n  ${t.grupo}`); grupoVisto = t.grupo; }
    let error = null;
    try { await t.fn(); } catch (e) { error = e; }
    const detalle = error ? `${error instanceof Falla ? '' : `${error && error.name || 'Error'}: `}${error && error.message || error}${error instanceof Falla ? '' : donde(error)}` : '';
    if (!t.motivo) {
      if (!error) { pasan++; print(`    ok        ${t.nombre}`); }
      else { fallan++; print(`    FALLA     ${t.nombre}\n              → ${detalle}`); }
    } else if (error) {
      conocidas++;
      print(`    conocida  ${t.nombre}\n              → ${t.motivo}\n              → ${detalle}`);
    } else {
      arregladas++;
      print(`    ARREGLADA ${t.nombre}: ya pasa; quítale la marca de falla conocida.`);
    }
  }
  print(`\n#RESUMEN ${archivo} pruebas=${lista.length} pasan=${pasan} fallan=${fallan} conocidas=${conocidas} arregladas=${arregladas}`);
  if (fallan) throw new Error(`${fallan} prueba(s) fallaron en ${archivo}`);
}
