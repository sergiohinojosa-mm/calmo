// Mensajes con la maestra y prácticas que ella pidió: notas, respuestas del alumno,
// quién marca qué como leído, lo que llega de otro teléfono y lo que se ve en pantalla.
import { reloj } from './lib/entorno.js';
import { grupo, prueba, fin, verdad, falso, igual, parecido, incluye, noIncluye } from './lib/prueba.js';
import { store, nuevaFamilia, como, clon } from './lib/ayudas.js';

const inicio = (await import('../../web/js/screens/inicio.js')).default;
const perfil = (await import('../../web/js/screens/perfil.js')).default;
const calendario = (await import('../../web/js/screens/calendario.js')).default;
const mensajes = (await import('../../web/js/screens/mensajes.js')).default;
const alumnos = (await import('../../web/js/screens/alumnos.js')).default;
const alumno = (await import('../../web/js/screens/alumno.js')).default;

// Familia con maestra: la maestra entra con su usuario y la familia vuelve a su perfil.
function escena() {
  const p = nuevaFamilia();
  const t = store.ensureTeacher('Pamela');
  store.setCurrent(p.Sergio.id);
  return { ...p, t };
}
const pantalla = (mod, params = [], query = '') => mod.render({ store, profile: store.profile(), params, query: new URLSearchParams(query) });

// ---------------------------------------------------------------------------
grupo('Conversación con la maestra');

prueba('la nota de la maestra le llega sin leer al alumno y su respuesta no cuenta como nota nueva', () => {
  const { Sergio, t } = escena();
  como(t.id, () => store.addNote(Sergio.id, '¡Vas muy bien!'));
  igual(store.unreadNotes(Sergio.id).length, 1);
  reloj.avanzarMin(5);
  store.addNote(Sergio.id, '¿Cuántas veces al día?');
  igual(store.unreadNotes(Sergio.id).length, 1, 'su propia respuesta apareció como nota de la maestra');
  igual(store.unreadReplies(Sergio.id).length, 1, 'la maestra no ve la respuesta como nueva');
  parecido(store.thread(Sergio.id).map((n) => n.text), ['¡Vas muy bien!', '¿Cuántas veces al día?'], 'la conversación va de la más vieja a la más nueva');
  verdad(store.isReply(store.thread(Sergio.id)[1]));
  falso(store.isReply(store.thread(Sergio.id)[0]));
});

prueba('abrir Mensajes deja leída la nota de la maestra, pero no la respuesta propia', () => {
  const { Sergio, t } = escena();
  como(t.id, () => store.addNote(Sergio.id, 'Practica antes de dormir'));
  store.addNote(Sergio.id, 'Va, gracias');
  verdad(store.markThreadRead(Sergio.id));
  igual(store.unreadNotes(Sergio.id).length, 0);
  igual(store.unreadReplies(Sergio.id).length, 1, 'se marcó como leída su propia respuesta');
  falso(store.markThreadRead(Sergio.id), 'volver a abrir no debe guardar de nuevo');
});

prueba('la maestra al abrir el detalle deja leída la respuesta y no sus propias notas', () => {
  const { Sergio, t } = escena();
  como(t.id, () => store.addNote(Sergio.id, 'Respira suave'));
  store.addNote(Sergio.id, 'Tengo una duda');
  como(t.id, () => store.markThreadRead(Sergio.id));
  igual(store.unreadReplies(Sergio.id).length, 0);
  igual(store.unreadNotes(Sergio.id).length, 1, 'la maestra marcó como leída su propia nota');
});

prueba('una nota vieja sin autor cuenta como de la maestra', () => {
  const { Sergio } = escena();
  const d = clon(store.snapshot().state);
  d.notes = [{ id: 'nota-vieja-1', profile: Sergio.id, text: 'Hola', at: new Date().toISOString(), updatedAt: Date.now() }];
  store.mergeRemote(d);
  igual(store.unreadNotes(Sergio.id).length, 1);
  igual(store.unreadReplies(Sergio.id).length, 0);
});

prueba('la respuesta escrita en otro teléfono llega a la maestra y su «leído» regresa', () => {
  const { Sergio, t } = escena();
  como(t.id, () => store.addNote(Sergio.id, '¡Vas muy bien!'));
  // El teléfono de la familia responde.
  reloj.avanzarMin(2);
  store.addNote(Sergio.id, '¡Gracias, Pamela!');
  const familia = clon(store.snapshot().state);
  // El de la maestra no tenía la respuesta; al juntar, le aparece como nueva.
  const sinRespuesta = clon(familia);
  sinRespuesta.notes = sinRespuesta.notes.filter((n) => !store.isReply(n));
  store.resetAll();
  store.mergeRemote(sinRespuesta);
  store.mergeRemote(familia);
  igual(store.unreadReplies(Sergio.id).length, 1);
  // Ella la lee; su versión es más nueva y gana al juntar con la vieja.
  reloj.avanzarMin(1);
  como(t.id, () => store.markThreadRead(Sergio.id));
  store.mergeRemote(familia);
  igual(store.unreadReplies(Sergio.id).length, 0, 'la copia vieja deshizo el «leído»');
});

// ---------------------------------------------------------------------------
grupo('Prácticas que pidió la maestra');

prueba('assignedBy: nombre de la maestra en lo que ella asignó y nada en lo de la familia', () => {
  const { Sergio, t } = escena();
  const [r] = como(t.id, () => store.assignPractice({ people: [Sergio.id], name: 'Antes de dormir', exerciseId: 'pausas', minutes: 5, time: '20:30' }));
  igual(store.assignedBy(r), 'Pamela');
  const propia = store.addRoutine({ name: 'Al despertar', exerciseId: 'coherente', minutes: 10, time: '06:00' });
  igual(store.assignedBy(propia), null);
  igual(store.assignedBy({ source: 'maestra', by: 'ya-no-existe' }), 'Tu maestra');
});

// ---------------------------------------------------------------------------
grupo('Lo que se ve en pantalla');

prueba('Inicio: la práctica asignada dice «Pamela lo pidió» y la propia no', () => {
  const { Sergio, t } = escena();
  reloj.fijar(2026, 6, 1, 18, 0);
  como(t.id, () => store.assignPractice({ people: [Sergio.id], name: 'Antes de dormir', exerciseId: 'pausas', minutes: 5, time: '20:30' }));
  store.addRoutine({ name: 'Otra antes de dormir', exerciseId: 'coherente', minutes: 10, time: '21:00' });
  const html = pantalla(inicio);
  igual(html.split('Pamela lo pidió').length - 1, 1, 'debe aparecer una sola vez, en la de la maestra');
  incluye(pantalla(calendario), 'Pamela lo pidió');
  incluye(pantalla(perfil), 'Pamela lo pidió');
});

prueba('Inicio: la nota trae «Marcar como leída», «Responder» y la X; al leerla se quita', () => {
  const { Sergio, t } = escena();
  const n = como(t.id, () => store.addNote(Sergio.id, '¡Vas muy bien!'));
  let html = pantalla(inicio);
  incluye(html, 'Marcar como leída');
  incluye(html, '#/mensajes?responder=1');
  incluye(html, 'aria-label="Quitar de Inicio"');
  store.markNoteRead(n.id);
  noIncluye(pantalla(inicio), '¡Vas muy bien!');
  incluye(pantalla(mensajes), '¡Vas muy bien!', 'la nota leída debe seguir en Mensajes');
});

prueba('las niñas ven «Ya la leí» y no tienen Responder ni Mensajes', () => {
  const { Ana, t } = escena();
  como(t.id, () => store.addNote(Ana.id, '¡Muy bien, Ana!'));
  como(Ana.id, () => {
    const html = pantalla(inicio);
    incluye(html, 'Ya la leí');
    noIncluye(html, 'Responder');
    noIncluye(pantalla(perfil), '#/mensajes');
    noIncluye(pantalla(mensajes), '<form');
  });
});

prueba('Mi perfil lleva a Mensajes con el nombre de la maestra y cuenta lo nuevo', () => {
  const { Sergio, t } = escena();
  incluye(pantalla(perfil), 'Mensajes con Pamela');
  como(t.id, () => store.addNote(Sergio.id, 'Hola'));
  incluye(pantalla(perfil), '1 nota nueva');
});

prueba('sin maestra no hay tarjeta de Mensajes ni formulario', () => {
  nuevaFamilia();
  noIncluye(pantalla(perfil), '#/mensajes');
  noIncluye(pantalla(mensajes), '<form');
});

prueba('la maestra ve la respuesta como «Nuevo» en el detalle y el aviso en Alumnos', () => {
  const { Sergio, t } = escena();
  como(t.id, () => store.addNote(Sergio.id, '¡Vas muy bien!'));
  store.addNote(Sergio.id, '¿Lo hago con los ojos cerrados?');
  como(t.id, () => {
    incluye(pantalla(alumnos), '1 mensaje nuevo');
    const html = pantalla(alumno, [Sergio.id]);
    incluye(html, 'Mensajes con Sergio');
    incluye(html, '¿Lo hago con los ojos cerrados?');
    incluye(html, 'class="new">Nuevo');
    // Solo puede borrar lo suyo.
    igual(html.split('data-del-note').length - 1, 1);
  });
});

prueba('los mensajes se muestran como texto, sin HTML', () => {
  const { Sergio } = escena();
  store.addNote(Sergio.id, '<img src=x onerror=alert(1)>');
  const html = pantalla(mensajes);
  noIncluye(html, '<img src=x');
  incluye(html, '&lt;img');
});

await fin('mensajes.prueba.js');
