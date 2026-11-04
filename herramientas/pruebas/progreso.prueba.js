// BOLT y pasos en Progreso (adultos) y en Mi perfil (niñas): qué tarjeta se ve en cada lado,
// qué mediciones entran en el periodo elegido y que la línea tenga su meta.
import { reloj } from './lib/entorno.js';
import { grupo, prueba, fin, igual, incluye, noIncluye } from './lib/prueba.js';
import { store, nuevaFamilia, como } from './lib/ayudas.js';

const progreso = (await import('../../web/js/screens/progreso.js')).default;
const perfil = (await import('../../web/js/screens/perfil.js')).default;
const alumno = (await import('../../web/js/screens/alumno.js')).default;

const pantalla = (mod, query = '', params = []) => mod.render({ store, profile: store.profile(), params, query: new URLSearchParams(query) });
// La descripción de la línea, sin la instrucción de cómo recorrerla.
const etiqueta = (html, que) => (html.match(new RegExp(`aria-label="(${que} en este periodo[^"]*?Meta [^."]*\\.)`)) || [])[1] || '';

// Sergio midió el lunes 25 de mayo y el lunes 1 de junio (hoy); la serie, solo hoy.
function conMediciones() {
  const p = nuevaFamilia({ dia: [2026, 5, 25, 7, 0] });
  como(p.Sergio.id, () => store.addBolt({ seconds: 11 }));
  reloj.fijar(2026, 6, 1, 7, 0);
  como(p.Sergio.id, () => {
    store.addBolt({ seconds: 14 });
    reloj.avanzarMin(30);
    store.addSteps({ steps: 30, type: 'serie', series: [24, 30, 28] });
  });
  store.setCurrent(p.Sergio.id);
  return p;
}

// ---------------------------------------------------------------------------
grupo('Progreso de un adulto');

prueba('Progreso trae BOLT y pasos con su botón para medir', () => {
  conMediciones();
  const html = pantalla(progreso);
  incluye(html, 'BOLT score');
  incluye(html, 'href="#/bolt"');
  incluye(html, 'Pasos sin respirar');
  incluye(html, 'href="#/serie"');
  incluye(html, 'Meta 40', 'la línea del BOLT debe marcar la meta');
  incluye(html, 'Meta 60', 'la línea de pasos debe marcar la meta');
});

prueba('la línea sigue al periodo: 7 días, semana anterior y mes', () => {
  conMediciones();
  // Últimos 7 días = 26 de mayo al 1 de junio: solo la de hoy.
  igual(etiqueta(pantalla(progreso, 'p=7d'), 'BOLT'), 'BOLT en este periodo: 1 medición, 14 s. Meta 40 s.');
  igual(etiqueta(pantalla(progreso, 'p=7d&o=-1'), 'BOLT'), 'BOLT en este periodo: 1 medición, 11 s. Meta 40 s.');
  incluye(pantalla(progreso, 'p=7d&o=-1'), 'Sin series en este periodo.');
  // Mayo solo tiene la del 25.
  igual(etiqueta(pantalla(progreso, 'p=mes&o=-1'), 'BOLT'), 'BOLT en este periodo: 1 medición, 11 s. Meta 40 s.');
});

prueba('con dos mediciones hay línea, promedio y mejor marca', () => {
  conMediciones();
  reloj.fijar(2026, 6, 2, 7, 0);
  store.addBolt({ seconds: 16 });
  const html = pantalla(progreso, 'p=7d');
  igual(etiqueta(html, 'BOLT'), 'BOLT en este periodo: 2 mediciones, de 14 a 16 s. Meta 40 s.');
  incluye(html, '<polyline');
  incluye(html, 'Promedio 15 s · mejor 16 s');
  incluye(html, 'Hoy: 16 s');
});

prueba('la serie muestra cada vuelta y el récord', () => {
  conMediciones();
  const html = pantalla(progreso);
  incluye(html, 'Hoy: 24 · 30 · 28 pasos');
  igual(etiqueta(html, 'Pasos'), 'Pasos en este periodo: 1 medición, 30 pasos. Meta 60 pasos.');
  incluye(html, 'tu mejor marca');
});

prueba('cada punto de la línea trae fecha, hora y valor para verlo con el dedo', () => {
  conMediciones();
  const html = pantalla(progreso, 'p=mes&o=-1');
  incluye(html, 'data-when="Lun 25 may · 07:00" data-val="11 s"');
  const hoy = pantalla(progreso);
  incluye(hoy, 'data-when="Hoy · 07:00" data-val="14 s"');
  incluye(hoy, 'data-val="30 pasos (24 · 30 · 28)"');
  incluye(hoy, 'Toca o desliza el dedo sobre la línea');
  incluye(hoy, 'tabindex="0"', 'la línea debe poder recorrerse con el teclado');
});

prueba('en Día se ve la hora de cada medición', () => {
  conMediciones();
  incluye(pantalla(progreso, 'p=dia'), '07:00: 14 s');
});

prueba('sin mediciones: invita a medir y no dibuja la línea', () => {
  nuevaFamilia();
  const html = pantalla(progreso);
  incluye(html, 'Sin mediciones en este periodo.');
  incluye(html, 'mídelo al despertar');
  igual(etiqueta(html, 'BOLT'), '', 'dibujó la línea del BOLT sin mediciones');
  igual(etiqueta(html, 'Pasos'), '', 'dibujó la línea de pasos sin series');
});

prueba('Mi perfil del adulto ya no mide: lleva a Progreso', () => {
  conMediciones();
  const html = pantalla(perfil);
  noIncluye(html, 'href="#/bolt"');
  noIncluye(html, 'href="#/serie"');
  incluye(html, 'href="#/progreso"');
  incluye(html, 'BOLT y pasos');
  incluye(html, 'Mis metas', 'las metas se siguen ajustando en Mi perfil');
});

// ---------------------------------------------------------------------------
grupo('La misma línea en el detalle de la maestra');

prueba('la maestra toca la línea del alumno y ve fecha y valor de BOLT y pasos', () => {
  const { Sergio } = conMediciones();
  const t = store.ensureTeacher('Maestra');
  const html = pantalla(alumno, '', [Sergio.id]);
  store.setCurrent(t.id);
  incluye(html, 'BOLT en sus últimas mediciones: 2 mediciones, de 11 a 14 s. Meta 40 s.');
  incluye(html, 'data-when="Lun 25 may · 07:00" data-val="11 s"');
  incluye(html, 'data-val="30 pasos (24 · 30 · 28)"');
  incluye(html, 'Toca o desliza el dedo sobre la línea');
});

// ---------------------------------------------------------------------------
grupo('Las niñas no cambian');

prueba('Junior conserva sus retos en Mi perfil y Progreso no le muestra BOLT', () => {
  const { Ana } = nuevaFamilia();
  como(Ana.id, () => {
    const html = pantalla(perfil);
    incluye(html, 'Mis retos');
    incluye(html, 'Hacer el reto');
    incluye(html, 'Vueltas caminando');
    noIncluye(html, 'BOLT y pasos');
    noIncluye(pantalla(progreso), 'BOLT score');
  });
});

prueba('el reto del aire de las niñas también se toca para ver cada día', () => {
  const { Ana } = nuevaFamilia();
  como(Ana.id, () => {
    store.addBolt({ seconds: 15 });
    reloj.avanzarDias(1);
    store.addBolt({ seconds: 17 });
    const html = pantalla(perfil);
    incluye(html, 'Reto del aire en tus últimos retos: 2 mediciones, de 15 a 17 s.');
    incluye(html, 'data-val="17 s"');
  });
});

await fin('progreso.prueba.js');
