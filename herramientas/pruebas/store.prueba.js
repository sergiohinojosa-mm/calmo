// store.js: familia y perfiles, sesiones y rutinas (±3 h), BOLT, agenda, racha y minutos.
import { reloj, fecha, persistencia } from './lib/entorno.js';
import { grupo, prueba, conocida, fin, verdad, falso, igual, parecido, incluye, vacio } from './lib/prueba.js';
import { store, nuevaFamilia, porNombre, sesion, como, datos, registrosDe } from './lib/ayudas.js';
import { dayKey } from '../../web/js/ui.js';

const adultos = () => store.profiles().filter((p) => p.kind === 'adulto');
const admins = () => store.profiles().filter((p) => p.kind === 'adulto' && p.admin);
const LUNES = (h = 0, m = 0) => fecha(2026, 6, 1, h, m);
const dia = (n, h = 0, m = 0) => fecha(2026, 6, 1 + n, h, m); // n días después del lunes 1 de junio

// ---------------------------------------------------------------------------
grupo('Familia y perfiles');

prueba('setupFamily: crea a cada quien, deja activo al primer adulto y los adultos administran', () => {
  store.resetAll();
  reloj.fijar(2026, 6, 1, 8, 0);
  const antes = persistencia.pedidas;
  store.setupFamily({ family: '  Hinojosa  ', withRoutines: false, people: [
    { name: ' Ana ', kind: 'junior', age: '10' },
    { name: 'Sergio', kind: 'adulto', age: 40 },
    { name: 'Lía', kind: 'peque', age: 5 },
    { name: 'Marcela', kind: 'adulto' },
  ] });
  const p = porNombre();
  parecido(Object.keys(p).sort(), ['Ana', 'Lía', 'Marcela', 'Sergio'], 'nombres sin espacios de más');
  igual(store.familyName(), 'Hinojosa');
  igual(store.profile().id, p.Sergio.id, 'perfil activo = primer adulto aunque la lista empiece con una niña');
  verdad(p.Sergio.admin && p.Marcela.admin, 'los adultos de la bienvenida son administradores');
  falso(p.Ana.admin || p['Lía'].admin, 'las niñas no son administradoras');
  igual(p.Ana.age, 10, 'la edad se guarda como número');
  verdad(store.profiles().every((x) => store.goals(x.id).weekly > 0), 'cada quien tiene meta semanal');
  verdad(store.goals(p['Lía'].id).weekly <= store.goals(p.Ana.id).weekly && store.goals(p.Ana.id).weekly <= store.goals(p.Sergio.id).weekly, 'metas a la medida de la edad');
  igual(store.routines(p.Sergio.id).length, 0, 'sin rutinas si no se piden');
  verdad(persistencia.pedidas > antes, 'pide al navegador conservar los datos');
});

prueba('setupFamily con rutinas: cada quien tiene rutinas desde hoy y los adultos una de BOLT', () => {
  const p = nuevaFamilia({ conRutinas: true });
  Object.values(p).forEach((x) => {
    const rs = store.routines(x.id);
    verdad(rs.length > 0, `${x.name} sin rutinas`);
    verdad(rs.every((r) => r.since === dayKey()), `${x.name}: las rutinas empiezan hoy`);
  });
  verdad(store.routines(p.Sergio.id).some((r) => r.kind === 'bolt'), 'Sergio tiene rutina de BOLT');
});

prueba('addProfile: limpia el nombre, edad como número, metas propias; adulto administra salvo que se diga', () => {
  nuevaFamilia();
  const t = store.addProfile({ name: '  Tomás ', kind: 'junior', age: '12' });
  igual(t.name, 'Tomás');
  igual(t.age, 12);
  falso(t.admin, 'un junior no administra');
  verdad(store.goals(t.id).weekly > 0, 'tiene metas');
  verdad(store.addProfile({ name: 'Abuela', kind: 'adulto' }).admin, 'adulto nuevo administra por omisión');
  falso(store.addProfile({ name: 'Tío', kind: 'adulto', admin: false }).admin, 'se respeta admin: false');
  igual(store.profiles().length, 7);
});

prueba('updateProfile: cambia nombre y edad (texto a número; vacía la quita)', () => {
  const p = nuevaFamilia();
  store.updateProfile(p.Ana.id, { name: 'Ana Sofía', age: '11' });
  igual(store.profile(p.Ana.id).name, 'Ana Sofía');
  igual(store.profile(p.Ana.id).age, 11);
  store.updateProfile(p.Ana.id, { age: '' });
  igual(store.profile(p.Ana.id).age, undefined);
});

prueba('updateProfile: adulto que pasa a niña deja de administrar; niña que pasa a adulta administra', () => {
  const p = nuevaFamilia();
  store.updateProfile(p.Marcela.id, { kind: 'junior' });
  falso(store.profile(p.Marcela.id).admin, 'junior no administra');
  store.updateProfile(p.Ana.id, { kind: 'adulto' });
  verdad(store.profile(p.Ana.id).admin, 'al volverse adulta administra');
  verdad(admins().length >= 1);
});

prueba('updateProfile: si el único administrador se quita el permiso, la familia sigue con uno', () => {
  const p = nuevaFamilia();
  store.updateProfile(p.Marcela.id, { admin: false });
  store.updateProfile(p.Sergio.id, { admin: false });
  verdad(admins().length >= 1, 'nadie quedó como administrador');
});

prueba('updateProfile: el único adulto no puede volverse niña (sigue habiendo adulto y administrador)',
  () => {
    const p = nuevaFamilia({ gente: [{ name: 'Sergio', kind: 'adulto' }, { name: 'Ana', kind: 'junior' }] });
    store.updateProfile(p.Sergio.id, { kind: 'junior' });
    verdad(adultos().length >= 1, 'la familia quedó sin adulto');
    verdad(admins().length >= 1, 'la familia quedó sin administrador');
  });

prueba('removeProfile: quita a una niña con todos sus datos y la recuerda como borrada', () => {
  const p = nuevaFamilia({ conRutinas: true });
  como(p.Ana.id, () => { sesion('coherente', LUNES(9)); store.addBolt({ seconds: 20 }); store.addSteps({ steps: 30, seconds: 40 }); });
  verdad(store.removeProfile(p.Ana.id), 'devuelve true');
  falso(store.profiles().some((x) => x.id === p.Ana.id), 'sigue en la lista');
  const d = datos();
  vacio(registrosDe(d, p.Ana.id), 'quedaron registros de Ana');
  igual(d.goals[p.Ana.id], undefined, 'metas');
  igual(d.badges[p.Ana.id], undefined, 'insignias');
  verdad(Number.isFinite(d.removed[p.Ana.id]), 'queda en «removed» para que no reviva');
});

prueba('removeProfile: nunca quita al último adulto', () => {
  const p = nuevaFamilia({ gente: [{ name: 'Sergio', kind: 'adulto' }, { name: 'Ana', kind: 'junior' }] });
  falso(store.removeProfile(p.Sergio.id), 'debía negarse');
  igual(adultos().length, 1);
});

prueba('removeProfile: si se quita al perfil activo, queda activo otro adulto', () => {
  const p = nuevaFamilia();
  igual(store.profile().id, p.Sergio.id);
  verdad(store.removeProfile(p.Sergio.id));
  igual(store.profile().id, p.Marcela.id);
});

prueba('removeProfile: si se va el único administrador, otro adulto queda como administrador',
  () => {
    const p = nuevaFamilia();
    store.updateProfile(p.Marcela.id, { admin: false });
    igual(admins().length, 1);
    verdad(store.removeProfile(p.Sergio.id));
    verdad(admins().length >= 1, 'la familia quedó sin administrador');
  });

// ---------------------------------------------------------------------------
grupo('Sesiones y rutina (±3 h)');

// Familia sin rutinas sugeridas y una rutina diaria de coherente a las 12:00 para Sergio.
function rutinaMediodia(extra = {}) {
  const p = nuevaFamilia();
  const r = store.addRoutine({ profile: p.Sergio.id, name: 'Mediodía', exerciseId: 'coherente', minutes: 10, time: '12:00', ...extra });
  return { p, r };
}

prueba('dentro de ±3 h cuenta: 9:00 y 15:00 cumplen la rutina de las 12:00 y dan hojas extra', () => {
  const { p, r } = rutinaMediodia();
  const a = sesion('coherente', dia(1, 9, 0));
  igual(a.session.routineId, r.id, '9:00 (3 h antes)');
  verdad(a.plannedPoints > 0, 'la sesión planeada da hojas extra');
  const b = sesion('coherente', dia(2, 15, 0));
  igual(b.session.routineId, r.id, '15:00 (3 h después)');
  igual(store.agenda(p.Sergio.id, dia(1)).find((i) => i.routine?.id === r.id).status, 'hecha');
});

prueba('fuera de ±3 h no cuenta: 8:59 y 15:01', () => {
  const { r } = rutinaMediodia();
  const a = sesion('coherente', dia(1, 8, 59));
  igual(a.session.routineId, null, '8:59');
  igual(a.plannedPoints, 0);
  const b = sesion('coherente', dia(2, 15, 1));
  igual(b.session.routineId, null, '15:01');
  verdad(r.id);
});

prueba('otro ejercicio dentro de la ventana no cumple la rutina', () => {
  rutinaMediodia();
  igual(sesion('cuadrada', dia(1, 12, 0)).session.routineId, null);
});

prueba('la rutina se cumple una vez al día; la segunda sesión queda como extra', () => {
  const { p, r } = rutinaMediodia();
  igual(sesion('coherente', dia(1, 12, 0)).session.routineId, r.id);
  igual(sesion('coherente', dia(1, 12, 30)).session.routineId, null);
  const ag = store.agenda(p.Sergio.id, dia(1));
  igual(ag.filter((i) => i.status === 'hecha').length, 1);
  igual(ag.filter((i) => i.status === 'extra').length, 1);
});

prueba('con dos rutinas del mismo ejercicio, la sesión cuenta para la más cercana', () => {
  const { p } = rutinaMediodia();
  const tarde = store.addRoutine({ profile: p.Sergio.id, name: 'Tarde', exerciseId: 'coherente', minutes: 10, time: '14:00' });
  igual(sesion('coherente', dia(1, 13, 40)).session.routineId, tarde.id);
});

// ---------------------------------------------------------------------------
grupo('BOLT');

const rutinaBolt = (id) => store.routines(id).find((r) => r.kind === 'bolt');

prueba('cualquier BOLT del día cumple la rutina de BOLT de ese día, a cualquier hora', () => {
  const p = nuevaFamilia({ conRutinas: true }); // Sergio: BOLT los lunes a las 5:15
  const rb = rutinaBolt(p.Sergio.id);
  verdad(rb, 'no hay rutina de BOLT');
  reloj.en(LUNES(23, 30));
  igual(store.addBolt({ seconds: 25 }).measure.routineId, rb.id, 'lunes 23:30');
  igual(store.agenda(p.Sergio.id, LUNES()).find((i) => i.routine?.id === rb.id).status, 'hecha');
  reloj.en(dia(7, 0, 5));
  igual(store.addBolt({ seconds: 26 }).measure.routineId, rb.id, 'lunes siguiente 0:05');
});

prueba('un BOLT de otro día no cumple la rutina del lunes', () => {
  const p = nuevaFamilia({ conRutinas: true });
  const rb = rutinaBolt(p.Sergio.id);
  reloj.en(dia(1, 6, 0)); // martes
  igual(store.addBolt({ seconds: 25 }).measure.routineId, null);
  igual(store.agenda(p.Sergio.id, LUNES()).find((i) => i.routine?.id === rb.id).status, 'no');
});

// ---------------------------------------------------------------------------
grupo('Agenda del calendario');

prueba('agenda: hecha, pendiente, no y extra', () => {
  const p = nuevaFamilia({ conRutinas: true }); // Sergio: BOLT 5:15 (lunes), coherente 5:30 y 21:00
  sesion('coherente', LUNES(6, 0));   // cumple la de 5:30
  sesion('exhalacion', LUNES(12, 0)); // sin rutina: extra
  const estado = (ag, hora) => ag.find((i) => i.time === hora)?.status;

  let hoy = store.agenda(p.Sergio.id, LUNES());
  igual(estado(hoy, '05:30'), 'hecha', '5:30 hoy');
  igual(estado(hoy, '05:15'), 'pendiente', 'BOLT hoy aún sin hacer');
  igual(estado(hoy, '21:00'), 'pendiente', '21:00 hoy');
  igual(estado(hoy, '12:00'), 'extra', 'sesión sin rutina');
  parecido(hoy.map((i) => i.time), [...hoy.map((i) => i.time)].sort(), 'ordenada por hora');

  reloj.en(dia(1, 8, 0)); // martes
  const ayer = store.agenda(p.Sergio.id, LUNES());
  igual(estado(ayer, '05:30'), 'hecha', 'lo hecho sigue hecho');
  igual(estado(ayer, '05:15'), 'no', 'BOLT de ayer sin hacer');
  igual(estado(ayer, '21:00'), 'no', '21:00 de ayer sin hacer');
  igual(estado(ayer, '12:00'), 'extra');
  hoy = store.agenda(p.Sergio.id, dia(1));
  igual(estado(hoy, '21:00'), 'pendiente', 'martes 21:00');
  igual(estado(hoy, '05:15'), undefined, 'el martes no hay BOLT');
  igual(estado(store.agenda(p.Sergio.id, dia(3)), '05:30'), 'pendiente', 'un día futuro está pendiente');
});

// ---------------------------------------------------------------------------
grupo('Racha, últimos 7 días y días practicados');

prueba('practicedDays junta sesiones, BOLT y pasos; cada día cuenta una vez', () => {
  const p = nuevaFamilia();
  sesion('coherente', LUNES(9));
  reloj.en(dia(1, 9)); store.addBolt({ seconds: 20 });
  reloj.en(dia(2, 9)); store.addSteps({ steps: 30, seconds: 40 });
  reloj.en(dia(3, 9)); sesion('coherente', dia(3, 9)); store.addBolt({ seconds: 21 });
  const dias = store.practicedDays(p.Sergio.id);
  igual(dias.size, 4);
  [0, 1, 2, 3].forEach((n) => verdad(dias.has(dayKey(dia(n))), `falta ${dayKey(dia(n))}`));
  igual(store.practicedDays(p.Ana.id).size, 0, 'lo de Sergio no cuenta para Ana');
});

prueba('streak: días seguidos hasta hoy; si hoy aún no practica cuenta hasta ayer; un hueco la corta', () => {
  const p = nuevaFamilia();
  [0, 1, 2].forEach((n) => sesion('coherente', dia(n, 9)));
  reloj.en(dia(2, 22)); igual(store.streak(p.Sergio.id), 3, 'hoy practicó');
  reloj.en(dia(3, 8)); igual(store.streak(p.Sergio.id), 3, 'hoy aún no, ayer sí');
  reloj.en(dia(4, 8)); igual(store.streak(p.Sergio.id), 0, 'ayer no practicó');
  sesion('coherente', dia(4, 9)); igual(store.streak(p.Sergio.id), 1, 'empieza otra racha');
});

prueba('last7: suma los minutos de hoy y los 6 días anteriores', () => {
  const p = nuevaFamilia();
  reloj.en(dia(14, 20));
  sesion('coherente', dia(14, 9), 10);       // hoy
  store.addSession({ exerciseId: 'coherente', startedAt: dia(8, 9), durationSec: 90 }); // hace 6 días, 1.5 min
  sesion('coherente', dia(7, 9), 30);        // hace 7 días: fuera
  como(p.Ana.id, () => sesion('coherente', dia(14, 10), 20)); // de otra persona
  igual(store.last7(p.Sergio.id), 11.5);
});

await fin('store.prueba.js');
