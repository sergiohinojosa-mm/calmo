// Estado de la app guardado en este teléfono (localStorage).
// Más adelante se sincroniza con la hoja "Calmo · datos" en Google Drive.

import { dayKey, fromKey, addDays, dow } from './ui.js';
import { byId } from './catalog.js';

const KEY = 'calmo.v1';

export const LEVELS = [
  { name: 'Semilla', min: 0 },
  { name: 'Brote', min: 100 },
  { name: 'Planta', min: 250 },
  { name: 'Árbol', min: 500 },
  { name: 'Bosque', min: 1000 },
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// Hora del cambio: al juntar dos teléfonos, gana la versión más reciente de cada cosa.
const stamp = (x) => ({ ...x, updatedAt: Date.now() });

function routine(profile, name, exerciseId, minutes, time, extra = {}) {
  return stamp({ id: uid(), profile, kind: 'sesion', name, exerciseId, minutes, time, freq: 'daily', days: [], active: true, since: dayKey(), ...extra });
}

function seed() {
  // La app empieza vacía: la familia se configura en la bienvenida y sus
  // datos viven solo en el teléfono (o en el respaldo privado de claude.ai).
  return {
    v: 1,
    current: null,
    familyName: '',
    profiles: [],
    goals: {},
    routines: [],
    sessions: [],
    bolt: [],
    steps: [],
    ledger: [],
    badges: {},
    rewards: defaultRewards(),
    redemptions: [],
    removed: {},
    prefs: { tones: true, music: 60, nature: 45, tonesVol: 80, ambient: 'bosque', lastDur: {} },
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...seed(), ...JSON.parse(raw) };
  } catch (e) { /* almacenamiento no disponible */ }
  return seed();
}

function save() {
  state.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin espacio o bloqueado */ }
  pushCloud();
  listeners.forEach((fn) => fn(state));
}

// ---------- Perfiles y metas ----------

export const profiles = () => state.profiles;
export const profile = (id = state.current) => state.profiles.find((p) => p.id === id) || state.profiles[0];
export const isKid = (p = profile()) => p.kind !== 'adulto';

// Quién cuida a quién: cada quien lo suyo, los adultos a los niños y los
// administradores a toda la familia (metas, rutinas y calendario).
export function canManage(id, targetId) {
  const me = state.profiles.find((p) => p.id === id);
  const other = state.profiles.find((p) => p.id === targetId);
  if (!me || !other) return false;
  if (me.id === other.id) return true;
  return me.kind === 'adulto' && (!!me.admin || other.kind !== 'adulto');
}

export function setCurrent(id) {
  state.current = id;
  save();
}

export function goals(id = state.current) {
  return { bolt: 40, steps: 80, weekly: 150, ...(state.goals[id] || {}) };
}

export function setGoal(id, key, value) {
  state.goals[id] = { ...goals(id), [key]: value, updatedAt: Date.now() };
  save();
}

export const prefs = () => state.prefs;
export function setPref(key, value) {
  state.prefs = { ...state.prefs, [key]: value };
  save();
}

// ---------- Rutinas ----------

// Rutinas vigentes del perfil. Las borradas se conservan solo para el historial.
export const routines = (id = state.current) => state.routines.filter((r) => r.profile === id && !r.deletedAt);
const allRoutines = (id) => state.routines.filter((r) => r.profile === id);

export function addRoutine(r) {
  const item = routine(r.profile || state.current, r.name, r.exerciseId, r.minutes, r.time, r);
  item.id = uid();
  state.routines.push(item);
  save();
  return item;
}

const SCHEDULE = ['profile', 'kind', 'exerciseId', 'minutes', 'time', 'freq', 'days', 'date'];
const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const hasHistory = (id) => [...state.sessions, ...state.bolt].some((x) => x.routineId === id);

// Cambiar el horario de una rutina que ya tiene días pasados crea una versión
// nueva desde hoy; la anterior se cierra para que el historial no cambie.
export function updateRoutine(id, patch) {
  const today = dayKey();
  const r = state.routines.find((x) => x.id === id);
  if (!r) return null;
  const next = { ...patch };
  if (patch.active === false && r.active !== false) next.pausedFrom = today;
  if (patch.active === true) next.pausedFrom = undefined;
  const changed = SCHEDULE.some((k) => k in patch && !sameValue(patch[k], r[k]));
  if (changed && r.since && r.since < today) {
    const fresh = stamp({ ...r, ...next, id: uid(), since: today });
    delete fresh.deletedAt;
    state.routines = state.routines.map((x) => (x.id === id ? stamp({ ...x, deletedAt: today }) : x));
    state.routines.push(fresh);
    // Lo hecho hoy pasa a la versión nueva para que hoy siga marcado.
    ['sessions', 'bolt'].forEach((k) => {
      state[k] = state[k].map((x) => (x.routineId === id && x.day === today ? stamp({ ...x, routineId: fresh.id }) : x));
    });
    save();
    return fresh;
  }
  state.routines = state.routines.map((x) => (x.id === id ? stamp({ ...x, ...next }) : x));
  save();
  return state.routines.find((x) => x.id === id);
}

// Borrado suave: deja de aplicar desde hoy y los días pasados conservan su historia.
// Una rutina creada hoy y sin sesiones se borra por completo.
export function removeRoutine(id) {
  const today = dayKey();
  const r = state.routines.find((x) => x.id === id);
  if (!r) return;
  if ((!r.since || r.since >= today) && !hasHistory(id)) {
    state.routines = state.routines.filter((x) => x.id !== id);
    forget(id);
  } else state.routines = state.routines.map((x) => (x.id === id ? stamp({ ...x, deletedAt: today }) : x));
  save();
}

export function routineApplies(r, date) {
  const key = dayKey(date);
  if (r.since && key < r.since) return false;
  if (r.deletedAt && key >= r.deletedAt) return false;
  if (r.active === false && key >= (r.pausedFrom || dayKey())) return false;
  if (r.freq === 'once') return r.date === key;
  if (r.freq === 'daily') return true;
  if (r.freq === 'weekdays') return dow(date) < 5;
  if (r.freq === 'days') return (r.days || []).includes(dow(date));
  return false;
}

export function routinesOn(id, date) {
  return allRoutines(id).filter((r) => routineApplies(r, date)).sort((a, b) => a.time.localeCompare(b.time));
}

function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Una sesión cuenta como planeada si se hace hasta 3 horas antes o después de la rutina.
// El BOLT cuenta para la rutina del día a cualquier hora, se mida desde donde se mida.
const MATCH_WINDOW = 180;

function matchRoutine(id, kind, exerciseId, when, preferId = null) {
  const key = dayKey(when);
  const taken = new Set([...state.sessions, ...state.bolt].filter((s) => s.profile === id && s.day === key && s.routineId).map((s) => s.routineId));
  const open = routinesOn(id, when).filter((r) => r.kind === kind && !taken.has(r.id));
  if (preferId) {
    const chosen = open.find((r) => r.id === preferId);
    if (chosen) return chosen.id;
  }
  const now = when.getHours() * 60 + when.getMinutes();
  const candidates = open.filter((r) => (kind === 'bolt' || (r.exerciseId === exerciseId && Math.abs(minutesOfDay(r.time) - now) <= MATCH_WINDOW)));
  candidates.sort((a, b) => Math.abs(minutesOfDay(a.time) - now) - Math.abs(minutesOfDay(b.time) - now));
  return candidates[0]?.id || null;
}

// ---------- Sesiones, hojas e insignias ----------

export const sessions = (id = state.current) => state.sessions.filter((s) => s.profile === id);

export function addSession({ exerciseId, startedAt, durationSec, controlPauses, routineId: wanted = null }) {
  const id = state.current;
  const when = new Date(startedAt);
  const before = unlockedBadges(id);
  const routineId = matchRoutine(id, 'sesion', exerciseId, when, wanted);
  const minutePoints = Math.max(1, Math.floor(durationSec / 60));
  const s = { id: uid(), profile: id, exerciseId, startedAt: when.toISOString(), day: dayKey(when), durationSec: Math.round(durationSec), routineId, controlPauses };
  state.sessions.push(s);
  state.ledger.push({ profile: id, at: s.startedAt, amount: minutePoints, reason: 'minutos' });
  if (routineId) state.ledger.push({ profile: id, at: s.startedAt, amount: 5, reason: 'planeada' });
  const newBadges = checkBadges(id, before);
  save();
  return { session: s, minutePoints, plannedPoints: routineId ? 5 : 0, newBadges, routine: state.routines.find((r) => r.id === routineId) };
}

export function addBolt({ seconds, morning, note, routineId: wanted = null }) {
  const id = state.current;
  const when = new Date();
  const before = unlockedBadges(id);
  const routineId = matchRoutine(id, 'bolt', null, when, wanted);
  const prev = bolt(id).at(-1);
  const m = { id: uid(), profile: id, takenAt: when.toISOString(), day: dayKey(when), seconds: Math.round(seconds), morning: !!morning, note: note || '', routineId };
  state.bolt.push(m);
  if (routineId) state.ledger.push({ profile: id, at: m.takenAt, amount: 5, reason: 'planeada' });
  const newBadges = checkBadges(id, before);
  save();
  return { measure: m, prev, newBadges };
}

export function addSteps({ steps, seconds, type = 'max', series }) {
  const id = state.current;
  const when = new Date();
  const before = unlockedBadges(id);
  const best = bestSteps(id);
  const m = { id: uid(), profile: id, takenAt: when.toISOString(), day: dayKey(when), steps, seconds: Math.round(seconds || 0), type, series };
  state.steps.push(m);
  const newBadges = checkBadges(id, before);
  save();
  return { measure: m, record: steps > best, best, newBadges };
}

export const bolt = (id = state.current) => state.bolt.filter((m) => m.profile === id);
export const steps = (id = state.current) => state.steps.filter((m) => m.profile === id);
export const lastBolt = (id = state.current) => bolt(id).at(-1);
export const bestSteps = (id = state.current) => steps(id).reduce((a, m) => Math.max(a, m.steps), 0);

export const points = (id = state.current) => state.ledger.filter((l) => l.profile === id).reduce((a, l) => a + l.amount, 0);

export function level(id = state.current) {
  const p = points(id);
  let i = 0;
  LEVELS.forEach((l, k) => { if (p >= l.min) i = k; });
  const next = LEVELS[i + 1];
  return { ...LEVELS[i], index: i, points: p, next, toNext: next ? next.min - p : 0, pct: next ? ((p - LEVELS[i].min) / (next.min - LEVELS[i].min)) * 100 : 100 };
}

export function practicedDays(id = state.current) {
  return new Set([...sessions(id), ...bolt(id), ...steps(id)].map((s) => s.day));
}

// Hojas por retos, pasos o series (no son sesiones guiadas).
export function awardPoints(profileId, amount, reason) {
  const n = Math.round(Number(amount) || 0);
  if (!n || !state.profiles.some((p) => p.id === profileId)) return 0;
  state.ledger.push({ profile: profileId, at: new Date().toISOString(), amount: n, reason: reason || 'reto' });
  save();
  return n;
}

export function streak(id = state.current) {
  const days = practicedDays(id);
  let d = new Date();
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function minutesBetween(id, from, to) {
  const a = dayKey(from), b = dayKey(to);
  return sessions(id).filter((s) => s.day >= a && s.day <= b).reduce((sum, s) => sum + s.durationSec / 60, 0);
}

export const last7 = (id = state.current) => minutesBetween(id, addDays(new Date(), -6), new Date());

// El reto en equipo se cumple cuando la familia junta los minutos de sus metas semanales.
const family = () => state.profiles.filter((p) => p.role !== 'maestra');

function familyMet() {
  const sum = family().reduce((a, p) => a + last7(p.id), 0);
  const goal = family().reduce((a, p) => a + (goals(p.id).weekly || 0), 0);
  return goal > 0 && sum >= goal;
}

// ---------- Insignias ----------

// kinds: para quién es la insignia (sin kinds, para todos). Cada perfil tiene 25.
const BIG = ['adulto', 'junior'];
const PEQUE = ['peque'];
const ofExercise = (exerciseId) => (id) => sessions(id).filter((s) => s.exerciseId === exerciseId).length;
const totalMinutes = (id) => Math.floor(sessions(id).reduce((a, s) => a + s.durationSec, 0) / 60);
const bestBolt = (id) => bolt(id).reduce((a, m) => Math.max(a, m.seconds), 0);
const bestDay = (id) => Math.max(0, ...Object.values(sessions(id).reduce((a, s) => ({ ...a, [s.day]: (a[s.day] || 0) + 1 }), {})));

export const BADGES = [
  { id: 'primera', name: 'Primera respiración', desc: 'Tu primera sesión', target: 1, value: (id) => sessions(id).length },
  { id: 'brote', name: 'Brote constante', desc: '3 días seguidos', target: 3, value: (id) => streak(id) },
  { id: 'semana', name: 'Semana de hojas', desc: '7 días seguidos', target: 7, value: (id) => streak(id) },
  { id: 'madrugada', name: 'Al despertar', desc: '5 sesiones antes de las 9:00', target: 5, value: (id) => sessions(id).filter((s) => new Date(s.startedAt).getHours() < 9).length },
  { id: 'buho', name: 'Búho sereno', desc: '5 sesiones después de las 20:00', target: 5, value: (id) => sessions(id).filter((s) => new Date(s.startedAt).getHours() >= 20).length },
  { id: 'despejada', name: 'Nariz despejada', desc: 'Haz «Destapar la nariz» 3 veces', kidDesc: 'Destapa tu nariz 3 veces', target: 3, kinds: BIG, value: ofExercise('destapar') },
  { id: 'equipo', name: 'Equipo en familia', desc: 'La familia llegó a su meta de 7 días', kidDesc: 'Toda la familia llegó a su meta', target: 1, value: () => (familyMet() ? 1 : 0) },
  { id: 'exploradora', name: 'Exploradora', desc: '5 ejercicios distintos', target: 5, kinds: BIG, value: (id) => new Set(sessions(id).map((s) => s.exerciseId)).size },
  { id: 'cumplida', name: 'Rutina cumplida', desc: '14 sesiones planeadas', target: 14, value: (id) => sessions(id).filter((s) => s.routineId).length },
  { id: 'caminante', name: 'Caminante', desc: '50 pasos sin respirar', target: 50, kinds: BIG, value: (id) => bestSteps(id) },
  { id: 'aire20', name: 'Reto del aire 20 s', kidDesc: 'Aguanta 20 s tranquila', desc: 'BOLT de 20 segundos', target: 20, value: bestBolt },
  { id: 'mes', name: 'Mes de calma', desc: '30 días seguidos', target: 30, value: (id) => streak(id) },
  // Para todos.
  { id: 'diez', name: 'Diez respiraciones', desc: '10 sesiones', kidDesc: 'Respira 10 veces', target: 10, value: (id) => sessions(id).length },
  { id: 'cincuenta', name: 'Cincuenta respiraciones', desc: '50 sesiones', kidDesc: 'Respira 50 veces', target: 50, value: (id) => sessions(id).length },
  { id: 'hora', name: 'Una hora de calma', desc: '60 minutos en total', kidDesc: 'Junta 60 minutos respirando', target: 60, value: totalMinutes },
  { id: 'cinco-horas', name: 'Cinco horas de calma', desc: '300 minutos en total', kidDesc: 'Junta 300 minutos respirando', target: 300, value: totalMinutes },
  { id: 'quincena', name: 'Dos semanas seguidas', desc: '14 días seguidos', kidDesc: 'Respira 14 días seguidos', target: 14, value: (id) => streak(id) },
  { id: 'aire15', name: 'Reto del aire 15 s', kidDesc: 'Aguanta 15 s tranquila', desc: 'BOLT de 15 segundos', target: 15, value: bestBolt },
  { id: 'medidora', name: 'Mido mi aire', desc: '10 mediciones de BOLT', kidDesc: 'Haz el reto del aire 10 veces', target: 10, value: (id) => bolt(id).length },
  { id: 'premio', name: 'Mi primer premio', desc: 'Un premio aprobado', kidDesc: 'Cambia tus hojas por un premio', target: 1, value: (id) => (state.redemptions || []).filter((r) => r.profile === id && r.status === 'aprobado').length },
  { id: 'meta-semana', name: 'Meta de la semana', desc: 'Llegaste a tu meta de minutos en 7 días', kidDesc: 'Llega a tu meta de la semana', target: 1, value: (id) => (last7(id) >= (goals(id).weekly || Infinity) ? 1 : 0) },
  // Adultos y Junior.
  { id: 'olas', name: 'Como las olas', desc: '5 sesiones de respiración coherente', kidDesc: 'Respira como las olas 5 veces', target: 5, kinds: BIG, value: ofExercise('coherente') },
  { id: 'caja', name: 'La caja', desc: '5 sesiones de respiración cuadrada', kidDesc: 'Haz la caja 5 veces', target: 5, kinds: BIG, value: ofExercise('cuadrada') },
  { id: 'ligera', name: 'Respiración ligera', desc: '5 sesiones de respirar ligero', kidDesc: 'Respira suavecito 5 veces', target: 5, kinds: BIG, value: ofExercise('ligero') },
  { id: 'caminante30', name: 'Primeros pasos', desc: '30 pasos sin respirar', kidDesc: 'Camina 30 pasos sin respirar', target: 30, kinds: BIG, value: (id) => bestSteps(id) },
  // Peque: sus propias prácticas.
  { id: 'flor', name: 'Huele la flor', desc: '5 veces «Huele la flor»', kidDesc: 'Huele la flor 5 veces', target: 5, kinds: PEQUE, value: ofExercise('flor') },
  { id: 'vela', name: 'La vela tranquila', desc: '5 veces «La vela tranquila»', kidDesc: 'Cuida la vela 5 veces', target: 5, kinds: PEQUE, value: ofExercise('vela') },
  { id: 'raton', name: 'Ratoncito', desc: '5 veces «Respira como ratón»', kidDesc: 'Respira como ratón 5 veces', target: 5, kinds: PEQUE, value: ofExercise('raton') },
  { id: 'las-tres', name: 'Probé las tres', desc: 'Las 3 prácticas de Peque', kidDesc: 'Haz la flor, la vela y el ratón', target: 3, kinds: PEQUE, value: (id) => new Set(sessions(id).map((s) => s.exerciseId).filter((e) => ['flor', 'vela', 'raton'].includes(e))).size },
  { id: 'siete-estrellas', name: 'Siete estrellas', desc: '7 días con práctica', kidDesc: 'Junta 7 estrellas', target: 7, kinds: PEQUE, value: (id) => practicedDays(id).size },
  { id: 'tres-retos', name: 'Tres retos del aire', desc: '3 retos del aire', kidDesc: 'Haz el reto del aire 3 veces', target: 3, kinds: PEQUE, value: (id) => bolt(id).length },
  { id: 'doble', name: 'Dos veces en un día', desc: '2 sesiones el mismo día', kidDesc: 'Respira 2 veces en un día', target: 2, kinds: PEQUE, value: bestDay },
];

const kindOf = (id) => state.profiles.find((p) => p.id === id)?.kind || 'adulto';
// Las insignias que le tocan a cada perfil según su edad.
export const badgesFor = (id = state.current) => BADGES.filter((b) => !b.kinds || b.kinds.includes(kindOf(id)));

export function unlockedBadges(id = state.current) {
  return { ...(state.badges[id] || {}) };
}

function checkBadges(id, before) {
  const fresh = [];
  state.badges[id] = state.badges[id] || {};
  for (const b of badgesFor(id)) {
    if (before[b.id]) continue;
    if (b.value(id) >= b.target) {
      state.badges[id][b.id] = new Date().toISOString();
      state.ledger.push({ profile: id, at: new Date().toISOString(), amount: 10, reason: 'insignia' });
      fresh.push(b);
    }
  }
  grantTeam(id);
  return fresh;
}

// La insignia de equipo es de todos: cuando la familia llega a su meta, la gana cada perfil.
function grantTeam(skip) {
  if (!familyMet()) return;
  const at = new Date().toISOString();
  family().filter((p) => p.id !== skip).forEach((p) => {
    state.badges[p.id] = state.badges[p.id] || {};
    if (state.badges[p.id].equipo) return;
    state.badges[p.id].equipo = at;
    state.ledger.push({ profile: p.id, at, amount: 10, reason: 'insignia' });
  });
}

export function badgeStatus(id = state.current) {
  const got = unlockedBadges(id);
  return badgesFor(id).map((b) => ({ ...b, earned: !!got[b.id], earnedAt: got[b.id], current: Math.min(b.value(id), b.target) }));
}

// ---------- Agenda del calendario ----------

const clockOf = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const realMinutes = (sec) => Math.max(1, Math.floor((sec || 0) / 60));

export function agenda(id, date) {
  const key = dayKey(date);
  const today = dayKey();
  const daySessions = sessions(id).filter((s) => s.day === key);
  const dayBolt = bolt(id).filter((m) => m.day === key);
  const plans = routinesOn(id, date);
  const planIds = new Set(plans.map((r) => r.id));
  // Un BOLT de ese día que no quedó ligado a una rutina (versiones anteriores) cuenta para la primera rutina de BOLT abierta.
  const looseBolt = dayBolt.filter((m) => !m.routineId || !planIds.has(m.routineId));
  const items = plans.map((r) => {
    const done = r.kind === 'bolt' ? (dayBolt.find((m) => m.routineId === r.id) || looseBolt.shift()) : daySessions.find((s) => s.routineId === r.id);
    let status = 'pendiente';
    if (done) status = 'hecha';
    else if (key < today) status = 'no';
    const ex = r.exerciseId ? byId(r.exerciseId) : null;
    return {
      type: 'plan', routine: r, status, time: r.time, title: r.name, exercise: ex, minutes: r.minutes,
      session: r.kind === 'bolt' ? undefined : done,
      measure: r.kind === 'bolt' ? done : undefined,
      realTime: done ? clockOf(done.startedAt || done.takenAt) : null,
      realMinutes: done && done.durationSec ? realMinutes(done.durationSec) : null,
    };
  });
  daySessions.filter((s) => !s.routineId || !planIds.has(s.routineId)).forEach((s) => {
    items.push({ type: 'extra', status: 'extra', time: clockOf(s.startedAt), title: byId(s.exerciseId)?.name || 'Sesión', exercise: byId(s.exerciseId), minutes: realMinutes(s.durationSec), session: s });
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- Datos ----------

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

// Reemplaza los datos con un respaldo exportado. Devuelve false si el archivo no sirve.
export function importJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return false; }
  if (!data || typeof data !== 'object' || !Array.isArray(data.profiles) || !data.profiles.length) return false;
  if (['routines', 'sessions', 'bolt', 'steps', 'ledger'].some((k) => data[k] !== undefined && !Array.isArray(data[k]))) return false;
  if (data.profiles.some((p) => !p || !p.id || !p.name)) return false;
  const current = state.current;
  state = { ...seed(), ...data };
  delete state.syncedAt;
  state.current = state.profiles.some((p) => p.id === current) ? current : (state.profiles.find((p) => p.kind === 'adulto') || state.profiles[0]).id;
  save();
  return true;
}

export function resetAll() {
  state = seed();
  save();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export { fromKey };

// ---------- PIN de adultos ----------
// Candado familiar sencillo para volver al perfil de un adulto en un teléfono compartido.

export const hasPin = (id) => !!(state.prefs.pins || {})[id];
export const checkPin = (id, pin) => (state.prefs.pins || {})[id] === pin;

export function setPin(id, pin) {
  state.prefs = { ...state.prefs, pins: { ...(state.prefs.pins || {}), [id]: pin }, pinsAt: { ...(state.prefs.pinsAt || {}), [id]: Date.now() } };
  save();
}

export function clearPin(id) {
  const pins = { ...(state.prefs.pins || {}) };
  delete pins[id];
  state.prefs = { ...state.prefs, pins, pinsAt: { ...(state.prefs.pinsAt || {}), [id]: Date.now() } };
  save();
}

// ---------- Administrar perfiles ----------

const DEFAULT_GOALS = {
  adulto: { bolt: 40, steps: 80, weekly: 150 },
  junior: { bolt: 20, steps: 40, weekly: 40 },
  peque: { bolt: 10, steps: 20, weekly: 10 },
};

// Edad → tipo de perfil. Un solo criterio para bienvenida y perfiles.
export function kindForAge(age) {
  const n = Number(age);
  if (!n) return null;
  return n <= 6 ? 'peque' : n <= 15 ? 'junior' : 'adulto';
}

export function addProfile({ name, kind = 'junior', age, admin, role }) {
  const p = stamp({ id: uid(), name: name.trim(), kind, age: age ? Number(age) : undefined, admin: admin ?? kind === 'adulto', role });
  state.profiles.push(p);
  state.goals[p.id] = { ...DEFAULT_GOALS[kind] };
  save();
  return p;
}

export function updateProfile(id, patch) {
  state.profiles = state.profiles.map((p) => {
    if (p.id !== id) return p;
    const next = stamp({ ...p, ...patch, age: patch.age !== undefined ? (patch.age ? Number(patch.age) : undefined) : p.age });
    if (next.kind !== 'adulto') next.admin = false;
    else if (patch.admin === undefined && p.kind !== 'adulto') next.admin = true;
    return next;
  });
  // Nunca queda la familia sin administrador.
  if (!state.profiles.some((p) => p.kind === 'adulto' && p.admin)) {
    const first = state.profiles.find((p) => p.kind === 'adulto');
    if (first) first.admin = true;
  }
  save();
}

// Quita el perfil y sus datos. Nunca deja la app sin un adulto.
export function removeProfile(id) {
  const p = profile(id);
  const adults = state.profiles.filter((x) => x.kind === 'adulto');
  if (!p || (p.kind === 'adulto' && adults.length <= 1)) return false;
  state.profiles = state.profiles.filter((x) => x.id !== id);
  forget(id);
  ['routines', 'sessions', 'bolt', 'steps', 'ledger', 'redemptions'].forEach((k) => { state[k] = (state[k] || []).filter((x) => x.profile !== id); });
  delete state.goals[id];
  delete state.badges[id];
  if (state.current === id) state.current = (state.profiles.find((x) => x.kind === 'adulto') || state.profiles[0]).id;
  save();
  return true;
}

// ---------- Respaldo en claude.ai ----------
// Cuando Calmo se abre como página de claude.ai, el estado completo se guarda
// en su almacén y se sincroniza entre los dispositivos donde la abras.
// El perfil activo es de cada dispositivo y no se sincroniza.

let cloudRef = null;
let pushTimer = null;
const remoteListeners = new Set();

function pushCloud() {
  if (!cloudRef) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    state.syncedAt = state.syncedAt || Date.now();
    const { current, syncedAt, ...rest } = state;
    cloudRef.set({ json: JSON.stringify(rest), updatedAt: state.updatedAt || Date.now() }).catch(() => {});
  }, 600);
}

export function onRemote(fn) {
  remoteListeners.add(fn);
  return () => remoteListeners.delete(fn);
}

async function connectCloud() {
  if (!window.claude?.use) return;
  const db = await window.claude.use('db');
  if (!db) return;
  const ref = db.doc('familia/estado');
  ref.onSnapshot((snap) => {
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists) { cloudRef = ref; state.syncedAt = Date.now(); pushCloud(); return; }
    cloudRef = ref;
    const body = snap.data();
    // Un dispositivo que nunca se ha sincronizado toma siempre lo guardado en la nube.
    const fresh = !state.syncedAt;
    if (!fresh && (body.updatedAt || 0) <= (state.updatedAt || 0)) {
      if ((body.updatedAt || 0) < (state.updatedAt || 0)) pushCloud();
      return;
    }
    try {
      const remote = JSON.parse(body.json);
      const current = state.current;
      state = { ...seed(), ...remote, current: remote.profiles?.some((p) => p.id === current) ? current : remote.profiles?.[0]?.id };
      state.updatedAt = body.updatedAt;
      state.syncedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin espacio o bloqueado */ }
      remoteListeners.forEach((fn) => fn(state));
    } catch (e) { /* documento ilegible: se ignora */ }
  }, () => { cloudRef = null; });
}

connectCloud();

// ---------- Bienvenida: configurar la familia ----------

export const familyName = () => state.familyName || 'Mi familia';

// Pide al navegador que no borre los datos de Calmo (Safari los borra tras días sin uso).
export function requestPersist() {
  try { navigator.storage?.persist?.().catch(() => {}); } catch (e) { /* no disponible */ }
}

const SUGGESTED = {
  adulto: [['Al despertar', 'coherente', 10, '05:30'], ['Antes de dormir', 'coherente', 10, '21:00']],
  junior: [['Antes de dormir', 'ligero', 5, '20:30']],
  peque: [['Antes de dormir', 'flor', 1, '20:00']],
};

// people: [{ name, kind, age }]. El primer adulto queda como perfil activo y administrador.
export function setupFamily({ family, people, withRoutines }) {
  state.familyName = (family || '').trim();
  people.forEach((x) => {
    const p = stamp({ id: uid(), name: x.name.trim(), kind: x.kind, age: x.age ? Number(x.age) : undefined, admin: x.kind === 'adulto' });
    state.profiles.push(p);
    state.goals[p.id] = { ...DEFAULT_GOALS[p.kind] };
    if (withRoutines) {
      SUGGESTED[p.kind].forEach(([name, exerciseId, minutes, time]) => state.routines.push(routine(p.id, name, exerciseId, minutes, time)));
      if (p.kind === 'adulto') state.routines.push(routine(p.id, 'Medir BOLT', null, 0, '05:15', { kind: 'bolt', freq: 'days', days: [0] }));
    }
  });
  state.current = (state.profiles.find((p) => p.kind === 'adulto') || state.profiles[0]).id;
  save();
  requestPersist();
}

// ---------- Sincronización con el servidor de la familia ----------

// Estado para enviar: sin el perfil activo, que es de cada dispositivo.
export function snapshot() {
  const { current, syncedAt, ...rest } = state;
  return { state: rest, updatedAt: state.updatedAt || 0 };
}

const byKey = (list, key) => {
  const m = new Map();
  (list || []).forEach((x) => m.set(key(x), x));
  return m;
};

function union(a, b, key) {
  const m = byKey(a, key);
  (b || []).forEach((x) => { if (!m.has(key(x))) m.set(key(x), x); });
  return [...m.values()];
}

// Lo borrado (perfiles y rutinas sin historia) se recuerda para que otro teléfono no lo reviva.
function forget(id) {
  state.removed = { ...(state.removed || {}), [id]: Date.now() };
}

const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Si otro teléfono dio de alta a la misma persona con otro id (mismo nombre), es la misma:
// sus datos pasan al perfil de este teléfono y no se duplica nadie.
function adoptSamePeople(remote) {
  const mine = new Map(state.profiles.map((p) => [norm(p.name), p.id]));
  const map = {};
  (remote.profiles || []).forEach((p) => {
    const local = mine.get(norm(p.name));
    if (local && local !== p.id && !state.profiles.some((x) => x.id === p.id)) map[p.id] = local;
  });
  if (!Object.keys(map).length) return remote;
  const re = (pid) => map[pid] || pid;
  const reKeys = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [re(k), v]));
  const reList = (list) => (list || []).map((x) => ({ ...x, profile: re(x.profile) }));
  return {
    ...remote,
    profiles: remote.profiles.filter((p) => !map[p.id]),
    goals: reKeys(remote.goals),
    badges: reKeys(remote.badges),
    removed: reKeys(remote.removed),
    routines: reList(remote.routines),
    sessions: reList(remote.sessions),
    bolt: reList(remote.bolt),
    steps: reList(remote.steps),
    ledger: reList(remote.ledger),
    redemptions: reList(remote.redemptions),
    prefs: { ...(remote.prefs || {}), pins: reKeys(remote.prefs?.pins), pinsAt: reKeys(remote.prefs?.pinsAt) },
  };
}

// Por id, gana la versión con el cambio más reciente; si empatan, la de este teléfono.
function newest(local, remote, alive) {
  const m = new Map((local || []).map((x) => [x.id, x]));
  (remote || []).forEach((x) => {
    const mine = m.get(x.id);
    if (!mine || (x.updatedAt || 0) > (mine.updatedAt || 0)) m.set(x.id, x);
  });
  return [...m.values()].filter(alive);
}

// Dos rutinas iguales (misma persona, hora, ejercicio y días) son una sola.
function dedupeRoutines(list, records) {
  const keep = new Map();
  const moved = {};
  list.forEach((r) => {
    if (r.deletedAt) return;
    const key = JSON.stringify([r.profile, r.kind, r.name, r.time, r.exerciseId || null, r.freq, r.days || [], r.date || null]);
    if (keep.has(key)) moved[r.id] = keep.get(key);
    else keep.set(key, r.id);
  });
  Object.keys(records).forEach((k) => {
    records[k] = records[k].map((x) => (moved[x.routineId] ? { ...x, routineId: moved[x.routineId] } : x));
  });
  return list.filter((r) => !moved[r.id]);
}

// Metas por persona y PIN por adulto: gana el cambio más reciente.
function newestPerKey(local = {}, remote = {}, at = (v) => v?.updatedAt || 0) {
  const out = { ...remote, ...local };
  Object.keys(remote).forEach((k) => { if (at(remote[k], k, 'remote') > at(local[k], k, 'local')) out[k] = remote[k]; });
  return out;
}

function mergePins(local = {}, remote = {}) {
  const lAt = local.pinsAt || {};
  const rAt = remote.pinsAt || {};
  const pins = {};
  const pinsAt = { ...rAt, ...lAt };
  new Set([...Object.keys(local.pins || {}), ...Object.keys(remote.pins || {}), ...Object.keys(pinsAt)]).forEach((id) => {
    const fromRemote = (rAt[id] || 0) > (lAt[id] || 0);
    if (fromRemote) pinsAt[id] = rAt[id];
    const pin = fromRemote ? (remote.pins || {})[id] : ((local.pins || {})[id] ?? (lAt[id] ? undefined : (remote.pins || {})[id]));
    if (pin) pins[id] = pin;
  });
  return { pins, pinsAt };
}

// Junta lo del servidor con lo de este teléfono: nadie se duplica, nada se pierde,
// los cambios más recientes ganan y lo borrado no regresa.
export function mergeRemote(incoming) {
  if (!incoming) return;
  const remote = adoptSamePeople(incoming);
  const removed = { ...(remote.removed || {}), ...(state.removed || {}) };
  const alive = (x) => !removed[x.id] && !removed[x.profile];
  const ledgerKey = (l) => `${l.profile}|${l.at}|${l.reason}|${l.amount}`;
  const records = {
    sessions: newest(state.sessions, remote.sessions, alive),
    bolt: newest(state.bolt, remote.bolt, alive),
  };
  const routines = dedupeRoutines(newest(state.routines, remote.routines, alive), records);
  const badges = { ...(remote.badges || {}) };
  Object.entries(state.badges || {}).forEach(([pid, got]) => { badges[pid] = { ...(badges[pid] || {}), ...got }; });
  const merged = {
    ...remote,
    familyName: state.familyName || remote.familyName,
    profiles: newest(state.profiles, remote.profiles, alive),
    routines,
    ...records,
    steps: newest(state.steps, remote.steps, alive),
    ledger: union(state.ledger, remote.ledger, ledgerKey).filter(alive),
    rewards: newest(state.rewards, remote.rewards, alive),
    redemptions: mergeRedemptions(state.redemptions, remote.redemptions).filter(alive),
    goals: newestPerKey(state.goals, remote.goals),
    badges,
    removed,
    prefs: { ...(remote.prefs || {}), ...state.prefs, ...mergePins(state.prefs, remote.prefs) },
  };
  replaceState(merged, Date.now());
}

// Reemplaza el estado con lo que llegó del servidor y avisa a la pantalla.
export function replaceState(remote, updatedAt) {
  const current = state.current;
  state = { ...seed(), ...remote };
  state.current = state.profiles.some((p) => p.id === current) ? current : (state.profiles.find((p) => p.kind === 'adulto') || state.profiles[0])?.id || null;
  state.updatedAt = updatedAt;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin espacio o bloqueado */ }
  remoteListeners.forEach((fn) => fn(state));
}

// ---------- Premios de la familia ----------
// Las hojas ganadas deciden el nivel; las hojas para premios son lo que queda
// después de los canjes pedidos o aprobados. Canjear nunca baja de nivel.

function defaultRewards() {
  return [
    ['Elegir la película del viernes', 80],
    ['Media hora más de pantalla', 100],
    ['Postre especial', 120],
    ['Ir por un helado', 150],
    ['Elegir la cena del domingo', 180],
    ['Libro nuevo', 250],
    ['Pijamada', 400],
    ['Salida especial con papá o mamá', 500],
  ].map(([name, cost], i) => ({ id: `premio-${i + 1}`, name, cost, active: true }));
}

// Un canje decidido (aprobado o pospuesto) gana sobre uno pendiente.
function mergeRedemptions(a = [], b = []) {
  const m = new Map();
  [...a, ...b].forEach((r) => {
    const prev = m.get(r.id);
    if (!prev || (!prev.decidedAt && r.decidedAt) || (r.decidedAt && prev.decidedAt && r.decidedAt > prev.decidedAt)) m.set(r.id, r);
  });
  return [...m.values()];
}

export const rewards = ({ all = false } = {}) => (state.rewards || []).filter((r) => all || r.active).sort((x, y) => x.cost - y.cost);

export const redemptions = (id) => (state.redemptions || []).filter((r) => !id || r.profile === id).sort((x, y) => y.requestedAt.localeCompare(x.requestedAt));

export const pendingRedemptions = () => redemptions().filter((r) => r.status === 'pendiente');

export function rewardBalance(id = state.current) {
  const spent = redemptions(id).filter((r) => r.status !== 'pospuesto').reduce((a, r) => a + r.cost, 0);
  return Math.max(0, points(id) - spent);
}

export function requestReward(rewardId, id = state.current) {
  const r = (state.rewards || []).find((x) => x.id === rewardId && x.active);
  if (!r) return { ok: false, error: 'Ese premio ya no está disponible.' };
  if (redemptions(id).some((x) => x.rewardId === rewardId && x.status === 'pendiente')) return { ok: false, error: 'Ya lo pediste: espera a que papá o mamá lo vean.' };
  if (rewardBalance(id) < r.cost) return { ok: false, error: `Te faltan ${r.cost - rewardBalance(id)} hojas.` };
  state.redemptions = [...(state.redemptions || []), stamp({ id: uid(), profile: id, rewardId, name: r.name, cost: r.cost, status: 'pendiente', requestedAt: new Date().toISOString() })];
  save();
  return { ok: true };
}

export function decideRedemption(redemptionId, approve) {
  state.redemptions = (state.redemptions || []).map((r) => (r.id === redemptionId
    ? stamp({ ...r, status: approve ? 'aprobado' : 'pospuesto', decidedAt: new Date().toISOString(), decidedBy: state.current })
    : r));
  const kid = state.redemptions.find((r) => r.id === redemptionId)?.profile;
  if (approve && kid) checkBadges(kid, unlockedBadges(kid));
  save();
}

export function saveReward({ id, name, cost, active = true }) {
  const clean = { name: String(name || '').trim().slice(0, 60), cost: Math.max(5, Math.round(Number(cost) || 0)), active };
  if (!clean.name) return false;
  if (id && (state.rewards || []).some((r) => r.id === id)) state.rewards = state.rewards.map((r) => (r.id === id ? stamp({ ...r, ...clean }) : r));
  else state.rewards = [...(state.rewards || []), stamp({ id: uid(), ...clean })];
  save();
  return true;
}
