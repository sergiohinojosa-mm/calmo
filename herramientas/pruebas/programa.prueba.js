// Lo nuevo para practicar mejor: rutinas que cuentan solo a su hora, aviso a la maestra al
// quitar lo que pidió, plan según el BOLT, programa por semanas, «¿Cómo te sentiste?»
// y el resumen de la semana de la maestra.
import { reloj } from './lib/entorno.js';
import { grupo, prueba, fin, verdad, falso, igual, incluye, noIncluye } from './lib/prueba.js';
import { store, nuevaFamilia, como, clon } from './lib/ayudas.js';
import { boltPlan } from '../../web/js/catalog.js';

const configurar = (await import('../../web/js/screens/configurar.js')).default;
const inicio = (await import('../../web/js/screens/inicio.js')).default;
const progreso = (await import('../../web/js/screens/progreso.js')).default;
const planear = (await import('../../web/js/screens/planear.js')).default;
const asignar = (await import('../../web/js/screens/asignar.js')).default;
const alumno = (await import('../../web/js/screens/alumno.js')).default;
const semana = (await import('../../web/js/screens/semana.js')).default;

const pantalla = (mod, query = '', params = []) => mod.render({ store, profile: store.profile(), params, query: new URLSearchParams(query) });

// Familia con maestra; la familia queda en el perfil de Sergio.
function escena(dia = [2026, 6, 1, 15, 56]) {
  const p = nuevaFamilia({ dia });
  const t = store.ensureTeacher('Maestra');
  store.setCurrent(p.Sergio.id);
  return { ...p, t };
}

// ---------------------------------------------------------------------------
grupo('Rutinas que cuentan a su hora');

prueba('tooEarlyFor: la de la noche hecha en la tarde no cuenta sola; la de la mañana hecha tarde sí', () => {
  const noche = { kind: 'sesion', time: '21:00' };
  verdad(store.tooEarlyFor(noche, new Date(2026, 5, 1, 15, 56)), '5 h antes debería pedir confirmación');
  falso(store.tooEarlyFor(noche, new Date(2026, 5, 1, 19, 0)), '2 h antes está dentro de la ventana');
  falso(store.tooEarlyFor({ kind: 'sesion', time: '05:30' }, new Date(2026, 5, 1, 16, 20)), 'hacerla tarde es ponerse al día');
  falso(store.tooEarlyFor({ kind: 'bolt', time: '21:00' }, new Date(2026, 5, 1, 8, 0)), 'el BOLT cuenta a cualquier hora');
});

prueba('el adulto elige si cuenta; por defecto es extra y con «Sí, cuenta» se marca la rutina', () => {
  escena();
  const r = store.addRoutine({ name: 'Antes de dormir', exerciseId: 'coherente', minutes: 10, time: '21:00' });
  const html = pantalla(configurar, `min=10&rutina=${r.id}`, ['coherente']);
  incluye(html, '¿Esta sesión cuenta para esa rutina?');
  noIncluye(html.match(/id="start"[^>]*href="([^"]*)"/)[1], 'rutina=', 'por defecto no debe marcar la rutina');
  const si = pantalla(configurar, `min=10&rutina=${r.id}&cuenta=1`, ['coherente']);
  incluye(si.match(/id="start"[^>]*href="([^"]*)"/)[1], `rutina=${r.id}`);
});

prueba('a su hora no pregunta nada y cuenta como siempre', () => {
  escena([2026, 6, 1, 20, 45]);
  const r = store.addRoutine({ name: 'Antes de dormir', exerciseId: 'coherente', minutes: 10, time: '21:00' });
  const html = pantalla(configurar, `min=10&rutina=${r.id}`, ['coherente']);
  noIncluye(html, '¿Esta sesión cuenta');
  incluye(html.match(/id="start"[^>]*href="([^"]*)"/)[1], `rutina=${r.id}`);
});

prueba('las niñas no eligen: muy antes de su hora, la tarjeta de Inicio la deja como extra', () => {
  const { Ana } = escena();
  como(Ana.id, () => {
    const r = store.addRoutine({ name: 'Antes de dormir', exerciseId: 'coherente', minutes: 5, time: '21:00' });
    noIncluye(pantalla(inicio), `rutina=${r.id}`);
  });
});

// ---------------------------------------------------------------------------
grupo('Quitar lo que pidió la maestra');

prueba('si Sergio quita la práctica de la maestra, a ella le llega un mensaje', () => {
  const { Sergio, t } = escena();
  const [r] = como(t.id, () => store.assignPractice({ people: [Sergio.id], name: 'Antes de dormir', exerciseId: 'pausas', minutes: 5, time: '20:30' }));
  store.removeRoutine(r.id);
  const [n] = store.unreadReplies(Sergio.id);
  igual(n && n.text, 'Quité la práctica que pediste: «Antes de dormir · 20:30».');
});

prueba('si papá quita la de su hija, el mensaje dice quién la quitó', () => {
  const { Ana, t } = escena();
  const [r] = como(t.id, () => store.assignPractice({ people: [Ana.id], name: 'Antes de dormir', exerciseId: 'coherente', minutes: 5, time: '20:30' }));
  store.removeRoutine(r.id);
  igual(store.unreadReplies(Ana.id)[0]?.text, 'Sergio quitó la práctica que pediste: «Antes de dormir · 20:30».');
});

prueba('si la quita la maestra o es una rutina propia, no hay mensaje', () => {
  const { Sergio, t } = escena();
  const [r] = como(t.id, () => store.assignPractice({ people: [Sergio.id], name: 'Antes de dormir', exerciseId: 'pausas', minutes: 5, time: '20:30' }));
  como(t.id, () => store.removeRoutine(r.id));
  store.removeRoutine(store.addRoutine({ name: 'Al despertar', exerciseId: 'coherente', minutes: 10, time: '06:00' }).id);
  igual(store.notes(Sergio.id).length, 0);
});

// ---------------------------------------------------------------------------
grupo('Tu plan según tu BOLT');

prueba('cada etapa de BOLT tiene su plan', () => {
  igual(boltPlan(8).title, 'Empieza suave');
  igual(boltPlan(14).title, 'Sube tu BOLT');
  igual(boltPlan(20).title, 'Vas bien');
  igual(boltPlan(35).title, 'Cerca de la meta');
  igual(boltPlan(45).title, 'Meta lograda');
  falso(boltPlan(8).items.some((i) => i.id === 'caminando'), 'con menos de 10 s no se sugiere la serie caminando');
});

prueba('el plan usa el BOLT de la mañana, no el de la tarde', () => {
  escena([2026, 6, 1, 6, 0]);
  store.addBolt({ seconds: 14, morning: true });
  reloj.fijar(2026, 6, 1, 16, 0);
  store.addBolt({ seconds: 9, morning: false });
  igual(store.planBolt().seconds, 14);
});

prueba('Progreso muestra el plan con «Agregar a mis rutinas» y lo que ya tienes', () => {
  escena([2026, 6, 1, 6, 0]);
  store.addBolt({ seconds: 14, morning: true });
  let html = pantalla(progreso);
  incluye(html, 'Tu plan · BOLT de la mañana 14 s');
  incluye(html, 'Sube tu BOLT');
  incluye(html, '#/planear?ex=ligero&min=10&de=progreso');
  noIncluye(html, '#/planear?ex=caminando', 'la serie caminando no se agenda');
  store.addRoutine({ name: 'Al despertar', exerciseId: 'ligero', minutes: 10, time: '06:30' });
  html = pantalla(progreso);
  incluye(html, 'Ya está en tus rutinas');
  incluye(pantalla(inicio), 'Tu plan: Sube tu BOLT');
});

prueba('desde el plan, Planear abre con el ejercicio y los minutos sugeridos', () => {
  escena();
  const html = pantalla(planear, 'ex=ligero&min=10&de=progreso');
  incluye(html, '<option value="ligero" selected>');
});

// ---------------------------------------------------------------------------
grupo('Programa por semanas');

function conPrograma() {
  const e = escena([2026, 6, 1, 8, 0]);
  const made = como(e.t.id, () => store.assignProgram({
    people: [e.Sergio.id], start: '2026-06-01', time: '20:30', name: 'Antes de dormir',
    weeks: [{ exerciseId: 'ligero', minutes: 5 }, { exerciseId: 'ligero', minutes: 10 }, { exerciseId: 'pausas', minutes: 10 }],
  }));
  return { ...e, made };
}

prueba('cada semana es una rutina con su inicio y su fin', () => {
  const { made } = conPrograma();
  igual(made.length, 3);
  igual(made.map((r) => `${r.since}..${r.until}`).join(' '), '2026-06-01..2026-06-07 2026-06-08..2026-06-14 2026-06-15..2026-06-21');
  verdad(made.every((r) => r.source === 'maestra' && r.weeks === 3 && r.program === made[0].program));
});

prueba('cada día toca solo la semana que corresponde, y al terminar ya no hay nada', () => {
  const { Sergio } = conPrograma();
  const minutosDe = (y, m, d) => store.routinesOn(Sergio.id, new Date(y, m - 1, d, 12)).filter((r) => r.program).map((r) => `${r.exerciseId} ${r.minutes}`).join(',');
  igual(minutosDe(2026, 6, 3), 'ligero 5');
  igual(minutosDe(2026, 6, 9), 'ligero 10');
  igual(minutosDe(2026, 6, 21), 'pausas 10');
  igual(minutosDe(2026, 6, 22), '');
});

prueba('Inicio dice en qué semana va y las semanas terminadas salen de Mi perfil', () => {
  const { Sergio } = conPrograma();
  reloj.fijar(2026, 6, 9, 18, 0);
  incluye(pantalla(inicio), 'Maestra lo pidió · semana 2 de 3');
  igual(store.currentProgram(Sergio.id).week, 2);
  igual(store.routines(Sergio.id).filter((r) => r.program).length, 2, 'la semana 1 ya terminó');
});

prueba('el programa sobrevive a otro teléfono (se guardan fin, programa y semana)', () => {
  const { Sergio } = conPrograma();
  const copia = clon(store.snapshot().state);
  store.resetAll();
  store.mergeRemote(copia);
  const weeks = store.routines(Sergio.id).filter((r) => r.program);
  igual(weeks.length, 3);
  igual(weeks[2].until, '2026-06-21');
  igual(weeks[2].week, 3);
});

prueba('Asignar ofrece el programa por semanas', () => {
  const { t } = escena();
  como(t.id, () => incluye(pantalla(asignar), 'Programa por semanas'));
});

// ---------------------------------------------------------------------------
grupo('¿Cómo te sentiste? y resumen de la semana');

prueba('lo que eligió se guarda en la sesión, sobrevive al juntar y la maestra lo ve', () => {
  const { Sergio, t } = escena([2026, 6, 1, 7, 0]);
  const { session } = store.addSession({ exerciseId: 'ligero', startedAt: new Date(), durationSec: 600 });
  store.setSessionFeel(session.id, 'costo');
  store.setSessionFeel(session.id, 'no-existe');
  const copia = clon(store.snapshot().state);
  store.mergeRemote(copia);
  igual(store.sessions(Sergio.id)[0].feel, 'costo');
  como(t.id, () => incluye(pantalla(alumno, '', [Sergio.id]), 'Le costó'));
});

prueba('el resumen compara con la semana pasada y dice quién pide atención', () => {
  const { Sergio, Ana, t } = escena([2026, 5, 25, 6, 0]);
  store.addBolt({ seconds: 16, morning: true });
  reloj.fijar(2026, 6, 1, 6, 0);
  store.addBolt({ seconds: 13, morning: true });
  como(Ana.id, () => store.addNote(Ana.id, 'Tengo una duda'));
  como(t.id, () => {
    const html = pantalla(semana);
    incluye(html, 'Resumen de la semana');
    incluye(html, '-3 s vs. la semana pasada');
    incluye(html, 'Su BOLT bajó');
    incluye(html, 'Te escribió');
    incluye(html, 'Para atender');
    incluye(html, `#/alumno/${Sergio.id}`);
  });
});

await fin('programa.prueba.js');
