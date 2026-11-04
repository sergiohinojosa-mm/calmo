// Decisiones de método de la maestra (noviembre 2026): coherente 4 · 4 para Junior,
// suspiro cíclico solo como herramienta puntual y meta de pasos de adultos en 60.
// El teléfono «ya usado» se arma en localStorage ANTES de cargar store.js, para probar la carga real.
import './lib/entorno.js';
import { grupo, prueba, fin, verdad, falso, igual, incluye, noIncluye } from './lib/prueba.js';

const ADULTO = 'a1';
const AJUSTADO = 'a2';
const NINA = 'j1';
localStorage.setItem('calmo.v1', JSON.stringify({
  v: 1, current: ADULTO, familyName: 'Prueba',
  profiles: [
    { id: ADULTO, name: 'Uno', kind: 'adulto', admin: true },
    { id: AJUSTADO, name: 'Dos', kind: 'adulto' },
    { id: NINA, name: 'Tres', kind: 'junior', age: 10 },
  ],
  goals: {
    [ADULTO]: { bolt: 40, steps: 80, weekly: 150 },
    [AJUSTADO]: { bolt: 40, steps: 80, weekly: 150, at: { steps: 1 }, updatedAt: 1 },
    [NINA]: { bolt: 20, steps: 40, weekly: 40 },
  },
  routines: [], sessions: [], bolt: [], steps: [],
}));

const store = await import('../../web/js/store.js');
const { byId, phasesFor, exercisesFor } = await import('../../web/js/catalog.js');

// ---------------------------------------------------------------------------
grupo('Meta de pasos de adultos: de 80 a 60');

prueba('al abrir la app, el adulto con el 80 de fábrica pasa a 60 y no se pierde nada', () => {
  igual(store.profiles().length, 3, 'la carga perdió perfiles');
  igual(store.goals(ADULTO).steps, 60);
});

prueba('quien ajustó su meta a mano la conserva', () => {
  igual(store.goals(AJUSTADO).steps, 80);
});

prueba('las metas de las niñas no cambian', () => {
  igual(store.goals(NINA).steps, 40);
});

prueba('un teléfono con la versión anterior (80 sin fecha) no regresa la meta a 80', () => {
  const viejo = JSON.parse(JSON.stringify(store.snapshot().state));
  viejo.goals[ADULTO] = { bolt: 40, steps: 80, weekly: 150 };
  store.mergeRemote(viejo);
  igual(store.goals(ADULTO).steps, 60);
});

prueba('un cambio a mano posterior sí gana', () => {
  store.setGoal(ADULTO, 'steps', 70);
  const otro = JSON.parse(JSON.stringify(store.snapshot().state));
  store.mergeRemote(otro);
  igual(store.goals(ADULTO).steps, 70);
});

prueba('un adulto nuevo empieza con 60 pasos', () => {
  store.resetAll();
  store.setupFamily({ family: 'Prueba', people: [{ name: 'Uno', kind: 'adulto', age: 40 }], withRoutines: false });
  igual(store.goals(store.profiles()[0].id).steps, 60);
});

// ---------------------------------------------------------------------------
grupo('Respiración coherente y suspiro cíclico');

prueba('coherente: Junior respira 4 · 4 y el adulto sigue en 5.5 · 5.5', () => {
  const ex = byId('coherente');
  igual(JSON.stringify(phasesFor(ex, 'junior')), JSON.stringify([['in', 4], ['out', 4]]));
  igual(JSON.stringify(phasesFor(ex, 'adulto')), JSON.stringify([['in', 5.5], ['out', 5.5]]));
});

prueba('suspiro cíclico: herramienta puntual que regresa a respirar ligero', () => {
  const ex = byId('suspiro');
  verdad(ex.puntual, 'no está marcado como puntual');
  verdad(/respirar ligero/.test(ex.desc), 'el texto de adultos no dice que se vuelve a respirar ligero');
  verdad(/suavecito/.test(ex.kidDesc), 'el texto de niñas no dice que se vuelve a respirar suavecito');
});

prueba('suspiro cíclico sigue en el catálogo de adultos y Junior', () => {
  incluye(exercisesFor('adulto').map((e) => e.id), 'suspiro');
  incluye(exercisesFor('junior').map((e) => e.id), 'suspiro');
});

prueba('solo el suspiro cíclico es puntual', () => {
  const puntuales = exercisesFor('adulto').concat(exercisesFor('junior'), exercisesFor('peque')).filter((e) => e.puntual).map((e) => e.id);
  igual([...new Set(puntuales)].join(','), 'suspiro');
  noIncluye(puntuales, 'coherente');
  falso(byId('exhalacion').puntual, 'la exhalación larga quedó como puntual');
});

await fin('metodo.prueba.js');
