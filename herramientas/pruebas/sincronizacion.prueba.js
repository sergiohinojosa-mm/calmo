// Sincronización entre teléfonos (mergeRemote), limpieza de datos de fuera (cleanState) y respaldos (importJSON).
// Un «teléfono» es el estado del store; lo que manda otro teléfono es una foto de snapshot() tomada antes.
import { reloj, fecha } from './lib/entorno.js';
import { grupo, prueba, conocida, fin, verdad, falso, igual, distinto, parecido, incluye, vacio } from './lib/prueba.js';
import { store, nuevaFamilia, sesion, como, datos, clon, registrosDe } from './lib/ayudas.js';

const LUNES = (h = 0, m = 0) => fecha(2026, 6, 1, h, m);
const T = '2026-06-01T15:00:00.000Z';
const KINDS = ['adulto', 'junior', 'peque'];
const foto = () => clon(store.snapshot().state); // lo que este teléfono manda al servidor
const luego = () => reloj.avanzarMin(1).getTime();
const norm = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const huerfanos = (d) => {
  const vivos = new Set(d.profiles.map((p) => p.id));
  return ['routines', 'sessions', 'bolt', 'steps', 'ledger', 'redemptions'].flatMap((k) => (d[k] || []).filter((x) => !vivos.has(x.profile)).map((x) => `${k}:${x.profile}`));
};
// Recorre un objeto y junta lo que `mal(llave, valor, ruta)` marque.
function recorrer(v, mal, ruta = '$', out = []) {
  if (Array.isArray(v)) v.forEach((x, i) => recorrer(x, mal, `${ruta}[${i}]`, out));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (mal(k, x)) out.push(`${ruta}.${k}`); recorrer(x, mal, `${ruta}.${k}`, out); });
  return out;
}

// ---------------------------------------------------------------------------
grupo('snapshot');

prueba('snapshot() no incluye el perfil activo (ni syncedAt); el perfil activo es de cada teléfono', () => {
  const p = nuevaFamilia();
  const s = store.snapshot();
  falso('current' in s.state, 'incluye current');
  falso('syncedAt' in s.state, 'incluye syncedAt');
  igual(s.state.profiles.length, 4);
  verdad(Number.isFinite(s.updatedAt));
  store.setCurrent(p.Ana.id);
  const remoto = foto();
  remoto.current = p.Sergio.id;
  store.mergeRemote(remoto);
  igual(store.profile().id, p.Ana.id, 'la mezcla cambió el perfil activo');
});

// ---------------------------------------------------------------------------
grupo('Unir por nombre y juntar rutinas');

prueba('la misma persona dada de alta en dos teléfonos (otro id, mismo nombre) no se duplica', () => {
  const a = nuevaFamilia({ gente: [{ name: 'Sergio', kind: 'adulto' }, { name: 'Ana', kind: 'junior' }, { name: 'Lía', kind: 'peque' }] });
  como(a.Ana.id, () => sesion('coherente', LUNES(10)));
  const deA = foto();
  const b = nuevaFamilia({ gente: [{ name: 'sergio ', kind: 'adulto' }, { name: 'ANA', kind: 'junior' }, { name: 'Lia', kind: 'peque' }] });
  sesion('coherente', LUNES(9));
  const idsA = deA.profiles.map((p) => p.id).sort();
  store.mergeRemote(deA);
  const d = datos();
  igual(d.profiles.length, 3, 'se duplicaron perfiles');
  igual(new Set(d.profiles.map((p) => norm(p.name))).size, 3, 'nombres repetidos');
  // Todos los teléfonos terminan con los ids del servidor; los viejos quedan como alias.
  parecido(d.profiles.map((p) => p.id).sort(), idsA, 'se adoptan los ids del servidor');
  igual(Object.keys(d.aliases || {}).length, 3, 'faltan alias de los ids viejos');
  igual(store.sessions(a.Ana.id).length, 1, 'la sesión de Ana del otro teléfono no pasó a su perfil');
  igual(d.sessions.length, 2);
  vacio(huerfanos(d), 'registros sin dueño');
  vacio(Object.keys(d.goals).filter((k) => !idsA.includes(k)), 'metas con ids viejos');
  vacio(Object.keys(d.badges).filter((k) => !idsA.includes(k)), 'insignias con ids viejos');
});

prueba('rutinas idénticas de dos teléfonos se juntan y la sesión pasa a la rutina que queda', () => {
  const gente = [{ name: 'Sergio', kind: 'adulto' }, { name: 'Ana', kind: 'junior' }];
  nuevaFamilia({ conRutinas: true, gente });
  const r = sesion('coherente', LUNES(6, 0));
  verdad(r.session.routineId, 'en el teléfono A la sesión no cumplió la rutina de 5:30');
  const deA = foto();
  const b = nuevaFamilia({ conRutinas: true, gente });
  const rutinasB = datos().routines.map((x) => x.id);
  const rutinasA = deA.routines.map((x) => x.id).sort();
  store.mergeRemote(deA);
  const d = datos();
  // Gana la rutina que ya estaba en el servidor; la de este teléfono queda borrada y no revive.
  parecido(d.routines.map((x) => x.id).sort(), rutinasA, 'quedaron rutinas repetidas');
  verdad(rutinasB.every((id) => d.removed[id]), 'las rutinas repetidas no quedaron marcadas como borradas');
  const s = d.sessions.find((x) => x.id === r.session.id);
  incluye(rutinasA, s.routineId, 'la sesión apunta a una rutina que ya no existe');
  igual(store.agenda(store.profiles().find((p) => p.name === 'Sergio').id, LUNES()).find((i) => i.time === '05:30')?.status, 'hecha');
});

// ---------------------------------------------------------------------------
grupo('Gana el cambio más reciente');

prueba('perfiles', () => {
  const p = nuevaFamilia();
  const base = foto();
  const r = clon(base);
  Object.assign(r.profiles.find((x) => x.id === p.Ana.id), { age: 11, updatedAt: luego() });
  store.mergeRemote(r);
  igual(store.profile(p.Ana.id).age, 11, 'el remoto más nuevo no ganó');
  luego();
  store.updateProfile(p.Ana.id, { age: 12 });
  const r2 = clon(base);
  r2.profiles.find((x) => x.id === p.Ana.id).age = 13;
  store.mergeRemote(r2);
  igual(store.profile(p.Ana.id).age, 12, 'el remoto viejo pisó el cambio local');
});

prueba('rutinas', () => {
  const p = nuevaFamilia();
  const rt = store.addRoutine({ profile: p.Sergio.id, name: 'Mediodía', exerciseId: 'coherente', minutes: 10, time: '12:00' });
  const base = foto();
  const r = clon(base);
  Object.assign(r.routines.find((x) => x.id === rt.id), { minutes: 20, updatedAt: luego() });
  store.mergeRemote(r);
  igual(store.routines(p.Sergio.id).find((x) => x.id === rt.id).minutes, 20, 'el remoto más nuevo no ganó');
  luego();
  igual(store.updateRoutine(rt.id, { name: 'Local' }).id, rt.id);
  const r2 = clon(base);
  r2.routines.find((x) => x.id === rt.id).name = 'Remoto';
  store.mergeRemote(r2);
  igual(store.routines(p.Sergio.id).find((x) => x.id === rt.id).name, 'Local', 'el remoto viejo pisó el cambio local');
});

prueba('premios', () => {
  nuevaFamilia();
  store.saveReward({ name: 'Helado', cost: 80 });
  const id = store.rewards().find((x) => x.name === 'Helado').id;
  const base = foto();
  const r = clon(base);
  Object.assign(r.rewards.find((x) => x.id === id), { cost: 95, updatedAt: luego() });
  store.mergeRemote(r);
  igual(store.rewards().find((x) => x.id === id).cost, 95, 'el remoto más nuevo no ganó');
  luego();
  store.saveReward({ id, name: 'Helado', cost: 70 });
  const r2 = clon(base);
  r2.rewards.find((x) => x.id === id).cost = 99;
  store.mergeRemote(r2);
  igual(store.rewards().find((x) => x.id === id).cost, 70, 'el remoto viejo pisó el cambio local');
});

prueba('canjes', () => {
  const p = nuevaFamilia();
  store.awardPoints(p.Ana.id, 500, 'reto');
  store.saveReward({ name: 'Helado', cost: 80 });
  store.saveReward({ name: 'Bici', cost: 250 });
  const premio = (n) => store.rewards().find((x) => x.name === n).id;
  verdad(store.requestReward(premio('Helado'), p.Ana.id).ok && store.requestReward(premio('Bici'), p.Ana.id).ok);
  const canje = (n) => store.redemptions(p.Ana.id).find((x) => x.rewardId === premio(n));
  const base = foto();
  // Allá aprueban el helado más tarde: gana allá.
  const r = clon(base);
  Object.assign(r.redemptions.find((x) => x.id === canje('Helado').id), { status: 'aprobado', decidedAt: new Date(luego()).toISOString(), decidedBy: p.Sergio.id, updatedAt: Date.now() });
  store.mergeRemote(r);
  igual(canje('Helado').status, 'aprobado', 'el remoto más nuevo no ganó');
  // Allá aprueban la bici, pero aquí la pospusieron después: gana aquí.
  const r2 = clon(base);
  Object.assign(r2.redemptions.find((x) => x.id === canje('Bici').id), { status: 'aprobado', decidedAt: new Date(luego()).toISOString(), decidedBy: p.Sergio.id, updatedAt: Date.now() });
  luego();
  store.decideRedemption(canje('Bici').id, false);
  store.mergeRemote(r2);
  igual(canje('Bici').status, 'pospuesto', 'el remoto viejo pisó la decisión local');
});

prueba('metas', () => {
  const p = nuevaFamilia();
  store.setGoal(p.Ana.id, 'weekly', 50);
  const base = foto();
  const r = clon(base);
  Object.assign(r.goals[p.Ana.id], { weekly: 60, updatedAt: luego() });
  store.mergeRemote(r);
  igual(store.goals(p.Ana.id).weekly, 60, 'el remoto más nuevo no ganó');
  luego();
  store.setGoal(p.Ana.id, 'weekly', 45);
  const r2 = clon(base);
  r2.goals[p.Ana.id].weekly = 99;
  store.mergeRemote(r2);
  igual(store.goals(p.Ana.id).weekly, 45, 'el remoto viejo pisó el cambio local');
});

prueba('dos teléfonos cambian metas distintas de la misma persona por primera vez y ninguna se pierde', () => {
  const p = nuevaFamilia();
  const base = foto();
  // Otro teléfono cambia el BOLT; este, los pasos.
  const r = clon(base);
  const t = luego();
  r.goals[p.Ana.id] = { ...r.goals[p.Ana.id], bolt: 30, at: { bolt: t }, updatedAt: t };
  luego();
  store.setGoal(p.Ana.id, 'steps', 70);
  store.mergeRemote(r);
  igual(store.goals(p.Ana.id).bolt, 30, 'se perdió el BOLT del otro teléfono');
  igual(store.goals(p.Ana.id).steps, 70, 'se perdieron los pasos de este teléfono');
});

prueba('una insignia ganada en dos teléfonos conserva la fecha más antigua', () => {
  const p = nuevaFamilia();
  const r = foto();
  r.badges = { ...(r.badges || {}), [p.Ana.id]: { primera: '2026-05-01T08:00:00.000Z' } };
  como(p.Ana.id, () => sesion('coherente', LUNES(10)));
  store.mergeRemote(r);
  igual(store.unlockedBadges(p.Ana.id).primera, '2026-05-01T08:00:00.000Z');
});

// ---------------------------------------------------------------------------
grupo('Lo borrado no revive');

prueba('una persona borrada aquí no regresa con lo que manda otro teléfono, ni sus registros', () => {
  const p = nuevaFamilia({ conRutinas: true });
  const lia = p['Lía'].id;
  como(lia, () => { sesion('flor', LUNES(9), 1); store.addBolt({ seconds: 12 }); });
  const remoto = foto();
  luego();
  verdad(store.removeProfile(lia));
  store.mergeRemote(remoto);
  falso(store.profiles().some((x) => x.id === lia), 'Lía revivió');
  vacio(registrosDe(datos(), lia), 'revivieron registros de Lía');
});

prueba('una persona borrada en otro teléfono también se va de aquí', () => {
  const p = nuevaFamilia();
  como(p.Ana.id, () => sesion('coherente', LUNES(9)));
  const r = foto();
  r.profiles = r.profiles.filter((x) => x.id !== p.Ana.id);
  r.removed = { ...r.removed, [p.Ana.id]: luego() };
  store.mergeRemote(r);
  falso(store.profiles().some((x) => x.id === p.Ana.id), 'Ana sigue aquí');
  vacio(registrosDe(datos(), p.Ana.id));
});

prueba('una rutina borrada (sin historia) no regresa', () => {
  const p = nuevaFamilia();
  const rt = store.addRoutine({ profile: p.Sergio.id, name: 'Nueva', exerciseId: 'coherente', minutes: 10, time: '12:00' });
  const remoto = foto();
  luego();
  store.removeRoutine(rt.id);
  store.mergeRemote(remoto);
  falso(datos().routines.some((x) => x.id === rt.id), 'la rutina revivió');
});

prueba('una rutina con historia que se borró sigue borrada y conserva su día hecho', () => {
  const p = nuevaFamilia();
  const rt = store.addRoutine({ profile: p.Sergio.id, name: 'Mediodía', exerciseId: 'coherente', minutes: 10, time: '12:00' });
  igual(sesion('coherente', LUNES(12)).session.routineId, rt.id);
  const remoto = foto();
  reloj.fijar(2026, 6, 2, 9, 0);
  store.removeRoutine(rt.id);
  store.mergeRemote(remoto);
  falso(store.routines(p.Sergio.id).some((x) => x.id === rt.id), 'la rutina volvió a estar vigente');
  igual(store.agenda(p.Sergio.id, LUNES()).find((i) => i.routine?.id === rt.id)?.status, 'hecha', 'se perdió la historia del lunes');
});

// ---------------------------------------------------------------------------
grupo('PIN');

prueba('un PIN quitado aquí no regresa con lo que manda otro teléfono', () => {
  const p = nuevaFamilia();
  store.setPin(p.Sergio.id, '1234');
  const remoto = foto();
  luego();
  store.clearPin(p.Sergio.id);
  store.mergeRemote(remoto);
  falso(store.hasPin(p.Sergio.id), 'el PIN regresó');
});

prueba('un PIN quitado en otro teléfono se quita aquí; un PIN nuevo más reciente se adopta', () => {
  const p = nuevaFamilia();
  store.setPin(p.Sergio.id, '1234');
  store.setPin(p.Marcela.id, '1111');
  const r = foto();
  const t = luego();
  delete r.prefs.pins[p.Sergio.id];
  r.prefs.pinsAt[p.Sergio.id] = t;
  r.prefs.pins[p.Marcela.id] = '2222';
  r.prefs.pinsAt[p.Marcela.id] = t;
  store.mergeRemote(r);
  falso(store.hasPin(p.Sergio.id), 'el PIN quitado allá sigue aquí');
  verdad(store.checkPin(p.Marcela.id, '2222'), 'no adoptó el PIN nuevo');
});

// ---------------------------------------------------------------------------
grupo('cleanState: datos que llegan de fuera');

const MALOS = ['<img src=x onerror=alert(1)>', 'a"b', "a'b", '"><script>alert(1)</script>', 'x y'];

prueba('descarta ids con HTML, comillas o espacios en todas las colecciones', () => {
  const raw = {
    profiles: [{ id: 'p1', name: 'Sergio', kind: 'adulto' }, ...MALOS.map((id, k) => ({ id, name: `Malo ${k}`, kind: 'adulto' }))],
    goals: { p1: { weekly: 100 }, ...Object.fromEntries(MALOS.map((id) => [id, { weekly: 1 }])) },
    routines: [{ id: 'r1', profile: 'p1', name: 'Bien', exerciseId: 'coherente', time: '07:00' },
      ...MALOS.map((id) => ({ id, profile: 'p1', name: 'Mal', time: '07:00' })),
      ...MALOS.map((id, k) => ({ id: `rp${k}`, profile: id, name: 'Mal', time: '07:00' }))],
    sessions: [{ id: 's1', profile: 'p1', exerciseId: 'coherente', startedAt: T, durationSec: 60, routineId: MALOS[0] },
      ...MALOS.map((id) => ({ id, profile: 'p1', exerciseId: 'coherente', startedAt: T, durationSec: 60 }))],
    bolt: [{ id: 'b1', profile: 'p1', takenAt: T, seconds: 20, routineId: MALOS[1] }, ...MALOS.map((id) => ({ id, profile: 'p1', takenAt: T, seconds: 20 }))],
    badges: { p1: { primera: T, [MALOS[0]]: T }, [MALOS[1]]: { primera: T } },
    rewards: [{ id: 'premio-1', name: 'Peli', cost: 80 }, ...MALOS.map((id) => ({ id, name: 'Mal', cost: 80 }))],
    redemptions: [{ id: 'c1', profile: 'p1', rewardId: MALOS[2], name: 'Peli', cost: 80, requestedAt: T, decidedBy: MALOS[3] },
      ...MALOS.map((id) => ({ id, profile: 'p1', rewardId: 'premio-1', cost: 80, requestedAt: T }))],
    removed: { ok1: 5, ...Object.fromEntries(MALOS.map((id) => [id, 5])) },
    prefs: { pins: { p1: '1234', ...Object.fromEntries(MALOS.map((id) => [id, '1111'])) }, pinsAt: { p1: 5, [MALOS[0]]: 5 } },
  };
  const c = store.cleanState(raw);
  parecido(c.profiles.map((x) => x.id), ['p1'], 'perfiles');
  parecido(Object.keys(c.goals), ['p1'], 'metas');
  parecido(c.routines.map((x) => x.id), ['r1'], 'rutinas');
  parecido(c.sessions.map((x) => x.id), ['s1'], 'sesiones');
  igual(c.sessions[0].routineId, null, 'routineId con HTML');
  parecido(c.bolt.map((x) => x.id), ['b1'], 'BOLT');
  igual(c.bolt[0].routineId, null);
  parecido(Object.keys(c.badges), ['p1'], 'insignias');
  parecido(Object.keys(c.badges.p1), ['primera']);
  parecido(c.rewards.map((x) => x.id), ['premio-1'], 'premios');
  parecido(c.redemptions.map((x) => x.id), ['c1'], 'canjes');
  falso(c.redemptions[0].rewardId === MALOS[2] || c.redemptions[0].decidedBy === MALOS[3], 'ids con HTML dentro del canje');
  parecido(Object.keys(c.removed), ['ok1'], 'borrados');
  parecido(Object.keys(c.prefs.pins), ['p1'], 'PIN');
  parecido(Object.keys(c.prefs.pinsAt), ['p1']);
  const ID = ['id', 'profile', 'routineId', 'rewardId', 'decidedBy', 'by'];
  vacio(recorrer(c, (k, v) => /[<>"'\s]/.test(k) || (ID.includes(k) && typeof v === 'string' && /[<>"'\s]/.test(v))), 'quedó algún id sospechoso');
});

prueba('convierte números escritos como texto y no deja NaN', () => {
  const raw = {
    updatedAt: '1780000000000',
    profiles: [{ id: 'p1', name: 'Ana', kind: 'junior', age: '9', updatedAt: '17' }, { id: 'p2', name: 'Sergio', kind: 'adulto', age: 'cuarenta' }],
    goals: { p1: { bolt: '35', steps: '70', weekly: '120', updatedAt: '18' }, p2: { weekly: 'mucho' } },
    routines: [{ id: 'r1', profile: 'p1', name: 'R', exerciseId: 'coherente', minutes: '10', time: '07:00', updatedAt: '19' }],
    sessions: [{ id: 's1', profile: 'p1', exerciseId: 'coherente', startedAt: T, durationSec: '300' }, { id: 's2', profile: 'p1', exerciseId: 'coherente', startedAt: T, durationSec: 'diez' }],
    bolt: [{ id: 'b1', profile: 'p1', takenAt: T, seconds: '25' }],
    steps: [{ id: 'm1', profile: 'p1', takenAt: T, steps: '42', seconds: '50', type: 'max', series: ['10', '12'] }],
    ledger: [{ profile: 'p1', at: T, amount: '7', reason: 'minutos' }, { profile: 'p1', at: T, amount: '3', reason: 'reto' }],
    rewards: [{ id: 'premio-1', name: 'Peli', cost: '90' }],
    redemptions: [{ id: 'c1', profile: 'p1', rewardId: 'premio-1', name: 'Peli', cost: '90', requestedAt: T }],
    prefs: { music: '30', nature: '20', tonesVol: '70' },
  };
  const c = store.cleanState(raw);
  igual(c.updatedAt, 1780000000000);
  igual(c.profiles[0].age, 9);
  igual(c.profiles[0].updatedAt, 17);
  igual(c.goals.p1.weekly, 120); igual(c.goals.p1.bolt, 35); igual(c.goals.p1.steps, 70); igual(c.goals.p1.updatedAt, 18);
  igual(c.routines[0].minutes, 10);
  igual(c.sessions[0].durationSec, 300);
  igual(c.bolt[0].seconds, 25);
  igual(c.steps[0].steps, 42); parecido(c.steps[0].series, [10, 12]);
  igual(c.ledger[0].amount, 7);
  igual(c.rewards[0].cost, 90);
  igual(c.redemptions[0].cost, 90);
  igual(c.prefs.music, 30); igual(c.prefs.tonesVol, 70);
  vacio(recorrer(c, (k, v) => typeof v === 'number' && !Number.isFinite(v)), 'quedaron NaN o Infinity');
  vacio(recorrer(c, (k, v) => ['age', 'weekly', 'durationSec', 'amount', 'cost', 'minutes', 'seconds', 'steps', 'updatedAt'].includes(k) && typeof v === 'string'), 'quedaron números como texto');
  // Las hojas se suman como números, no como texto.
  verdad(store.importJSON(JSON.stringify(raw)));
  igual(store.points('p1'), 10);
});

prueba('un kind (o estado) inválido nunca entra tal cual', () => {
  const c = store.cleanState({
    profiles: [{ id: 'p1', name: 'A', kind: 'superadmin' }, { id: 'p2', name: 'B', kind: '<script>' }, { id: 'p3', name: 'C' }],
    routines: [{ id: 'r1', profile: 'p1', name: 'R', kind: 'hack', freq: 'siempre', exerciseId: 'coherente', time: '07:00' }],
    redemptions: [{ id: 'c1', profile: 'p1', requestedAt: T, status: 'regalado' }],
    steps: [{ id: 'm1', profile: 'p1', takenAt: T, steps: 5, type: 'turbo' }],
  });
  c.profiles.forEach((x) => incluye(KINDS, x.kind, `perfil ${x.id}`));
  c.routines.forEach((x) => { incluye(['sesion', 'bolt'], x.kind, 'rutina'); incluye(['daily', 'weekdays', 'days', 'once'], x.freq, 'frecuencia'); });
  c.redemptions.forEach((x) => incluye(['pendiente', 'aprobado', 'pospuesto'], x.status, 'canje'));
  c.steps.forEach((x) => incluye(['max', 'serie'], x.type, 'pasos'));
});

prueba('no ejecuta nada ni contamina prototipos (__proto__, constructor, HTML, javascript:)', () => {
  globalThis.__ejecutado = 0;
  const texto = `{
    "__proto__": {"contaminado": "sí"},
    "constructor": {"prototype": {"contaminado": "sí"}},
    "familyName": "<img src=x onerror=\\"globalThis.__ejecutado++\\">",
    "profiles": [
      {"id": "p1", "name": "<script>__ejecutado++</script>", "kind": "adulto", "__proto__": {"admin": true}},
      {"id": "p2", "name": "Ana", "kind": "junior", "constructor": {"prototype": {"admin": true}}}
    ],
    "goals": {"__proto__": {"contaminado": "sí"}, "p1": {"weekly": "globalThis.__ejecutado++"}},
    "sessions": [
      {"id": "s1", "profile": "p1", "exerciseId": "constructor", "startedAt": "${T}"},
      {"id": "s2", "profile": "p1", "exerciseId": "coherente", "startedAt": "javascript:globalThis.__ejecutado++"}
    ],
    "prefs": {"__proto__": {"contaminado": "sí"}, "ambient": "javascript:globalThis.__ejecutado++"}
  }`;
  const c = store.cleanState(JSON.parse(texto));
  nuevaFamilia();
  store.mergeRemote(JSON.parse(texto));
  verdad(store.importJSON(texto));
  igual(globalThis.__ejecutado, 0, 'se ejecutó código');
  igual(({}).contaminado, undefined, 'Object.prototype contaminado');
  igual(({}).admin, undefined, 'Object.prototype contaminado');
  vacio(recorrer(c, (k, v) => typeof v === 'function' || (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)), 'el resultado no es dato plano');
  igual(c.profiles.find((x) => x.id === 'p1').name, '<script>__ejecutado++</script>', 'el texto se guarda como texto (se escapa al mostrarlo)');
  falso(c.profiles.some((x) => x.admin), 'un __proto__ dio permisos de administrador');
  verdad(Number.isFinite(c.goals.p1.weekly), 'meta con código');
  vacio(c.sessions, 'pasaron sesiones con ejercicio o fecha inválidos');
  distinto(c.prefs.ambient, 'javascript:globalThis.__ejecutado++');
});

// ---------------------------------------------------------------------------
grupo('importJSON');

prueba('rechaza basura y no toca los datos', () => {
  nuevaFamilia();
  sesion('coherente', LUNES(9));
  const antes = store.exportJSON();
  const BASURA = [undefined, '', 'hola', '{', 'null', '42', '"texto"', '[]', '[1,2,3]', '{}', '{"profiles": []}', '{"profiles": "Sergio"}',
    '{"profiles": [null, 3, "x"]}', '{"profiles": [{"id": "<x>", "name": "A"}]}', '{"profiles": [{"id": "p1"}]}', '{"profiles": [{"id": "p1", "name": "   "}]}'];
  BASURA.forEach((t) => falso(store.importJSON(t), `aceptó ${JSON.stringify(t)}`));
  igual(store.exportJSON(), antes, 'los datos cambiaron');
});

prueba('acepta un respaldo válido y lo deja igual', () => {
  const p = nuevaFamilia({ conRutinas: true });
  sesion('coherente', LUNES(6));
  store.addBolt({ seconds: 22 });
  store.addSteps({ steps: 40, seconds: 50 });
  como(p.Ana.id, () => sesion('ligero', LUNES(20, 30), 5));
  store.awardPoints(p.Ana.id, 200, 'reto');
  verdad(store.requestReward(store.rewards()[0].id, p.Ana.id).ok);
  store.decideRedemption(store.pendingRedemptions()[0].id, true);
  store.setPin(p.Sergio.id, '1234');
  store.setGoal(p.Ana.id, 'weekly', 55);
  const resumen = (x) => ({
    perfiles: x.profiles.map((q) => [q.id, q.name, q.kind, !!q.admin, q.age ?? null]),
    rutinas: x.routines.map((r) => [r.id, r.kind, r.time, r.exerciseId || null, r.since]),
    sesiones: x.sessions.map((s) => [s.id, s.routineId, s.durationSec, s.day]),
    bolt: x.bolt.map((m) => [m.id, m.seconds, m.routineId]),
    pasos: x.steps.map((m) => [m.id, m.steps]),
    hojas: x.ledger.length,
    insignias: x.badges,
    canjes: x.redemptions.map((r) => [r.id, r.status, r.cost]),
    pins: x.prefs.pins,
  });
  const ids = store.profiles().map((q) => q.id);
  const metas = () => ids.map((id) => [store.goals(id).bolt, store.goals(id).steps, store.goals(id).weekly]);
  const hojas = () => ids.map((id) => store.points(id));
  const respaldo = store.exportJSON();
  const antes = { resumen: resumen(JSON.parse(respaldo)), metas: metas(), hojas: hojas() };
  store.resetAll();
  igual(store.profiles().length, 0);
  verdad(store.importJSON(respaldo), 'rechazó el respaldo');
  parecido(resumen(datos()), antes.resumen);
  parecido(metas(), antes.metas, 'metas');
  parecido(hojas(), antes.hojas, 'hojas');
  igual(store.profile().kind, 'adulto', 'queda activo un adulto');
});

prueba('acepta un respaldo mínimo escrito a mano', () => {
  store.resetAll();
  verdad(store.importJSON('{"profiles":[{"id":"p1","name":"Sergio","kind":"adulto"}]}'));
  igual(store.profiles().length, 1);
  igual(store.profile().id, 'p1');
});

// Al final: si falla, deja contaminado Object.prototype (se limpia en finally).
prueba('un id reservado («__proto__») en un respaldo no contamina los objetos ni quita insignias a los demás',
  () => {
    const propios = new Set(Object.getOwnPropertyNames(Object.prototype));
    try {
      store.resetAll();
      reloj.fijar(2026, 6, 1, 8, 0);
      store.importJSON(JSON.stringify({ profiles: [{ id: '__proto__', name: 'Raro', kind: 'adulto' }, { id: 'p1', name: 'Sergio', kind: 'adulto' }] }));
      if (store.profiles().some((x) => x.id === '__proto__')) { store.setCurrent('__proto__'); sesion('coherente', LUNES(10)); }
      igual(({}).primera, undefined, 'Object.prototype quedó con «primera»');
      store.setCurrent('p1');
      incluye(sesion('coherente', LUNES(11)).newBadges.map((b) => b.id), 'primera', 'Sergio no recibió «primera»');
    } finally {
      Object.getOwnPropertyNames(Object.prototype).filter((k) => !propios.has(k)).forEach((k) => { delete Object.prototype[k]; });
    }
  });

await fin('sincronizacion.prueba.js');
