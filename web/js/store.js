// Estado de la app guardado en este teléfono (localStorage).
// Más adelante se sincroniza con la hoja "Calmo · datos" en Google Drive.

import { dayKey, fromKey, addDays, dow } from './ui.js';
import { byId, AMBIENTS } from './catalog.js';

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
    notes: [],
    removed: {},
    aliases: {},
    prefs: { tones: true, music: 60, nature: 45, tonesVol: 80, ambient: 'bosque', lastDur: {} },
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return stepsGoal60({ ...seed(), ...JSON.parse(raw) });
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
  if (me.role === 'maestra') return other.role !== 'maestra';
  return me.kind === 'adulto' && (!!me.admin || other.kind !== 'adulto');
}

// ---------- Maestra ----------
// La maestra tiene su propio perfil para practicar, pero no entra al ranking ni al reto
// de la familia. Sus prácticas asignadas son rutinas con source: 'maestra'.

export const familyMembers = () => state.profiles.filter((p) => p.role !== 'maestra');
export const teacher = () => state.profiles.find((p) => p.role === 'maestra') || null;

// Al entrar con su usuario, la maestra usa (o crea) su perfil y no el de la familia.
export function ensureTeacher(nombre) {
  const name = String(nombre || 'Maestra').trim().slice(0, 40) || 'Maestra';
  let t = state.profiles.find((p) => p.role === 'maestra' && norm(p.name) === norm(name)) || teacher();
  if (!t) {
    t = stamp({ id: uid(), name, kind: 'adulto', admin: false, role: 'maestra' });
    state.profiles.push(t);
    state.goals[t.id] = { ...DEFAULT_GOALS.adulto };
  }
  state.current = t.id;
  save();
  return t;
}

// Nombre de la maestra por su perfil, o «Tu maestra» si ya no está.
export const teacherName = (id) => state.profiles.find((p) => p.id === id && p.role === 'maestra')?.name || 'Tu maestra';

// Quién pidió una rutina: la maestra que la asignó, o null si es de la familia.
export const assignedBy = (r) => (r?.source === 'maestra' ? teacherName(r.by) : null);

// Mensajes: cada alumno tiene una conversación con la maestra. Ella escribe notas y el
// alumno le responde ahí mismo; una respuesta es la que escribe el dueño de la conversación.
// Cada quien marca como leído lo que le escribió el otro.
export const notes = (id) => (state.notes || []).filter((n) => !id || n.profile === id).sort((a, b) => b.at.localeCompare(a.at));
export const isReply = (n) => !!n.by && n.by === n.profile;
export const thread = (id) => notes(id).reverse();
export const unreadNotes = (id) => notes(id).filter((n) => !n.readAt && !isReply(n));
export const unreadReplies = (id) => notes(id).filter((n) => !n.readAt && isReply(n));

export function addNote(profileId, text) {
  const clean = String(text || '').trim().slice(0, 280);
  if (!clean || !state.profiles.some((p) => p.id === profileId)) return null;
  const n = stamp({ id: uid(), profile: profileId, by: state.current, text: clean, at: new Date().toISOString() });
  state.notes = [...(state.notes || []), n];
  save();
  return n;
}

export function markNoteRead(noteId) {
  state.notes = (state.notes || []).map((n) => (n.id === noteId ? stamp({ ...n, readAt: new Date().toISOString() }) : n));
  save();
}

// Al abrir una conversación queda leído lo que escribió el otro (nunca lo propio).
export function markThreadRead(profileId) {
  const me = state.current;
  const at = new Date().toISOString();
  let changed = false;
  state.notes = (state.notes || []).map((n) => {
    if (n.profile !== profileId || n.readAt || n.by === me) return n;
    changed = true;
    return stamp({ ...n, readAt: at });
  });
  if (changed) save();
  return changed;
}

export function removeNote(noteId) {
  state.notes = (state.notes || []).filter((n) => n.id !== noteId);
  forget(noteId);
  save();
}

// Programa por semanas: cada semana es una rutina con su inicio y su fin (since / until),
// así el calendario, Inicio y lo que cuenta como hecho funcionan igual que con cualquier rutina.
export function assignProgram({ people, weeks, start = dayKey(), time, freq = 'daily', days = [], name, note }) {
  const by = state.current;
  const program = uid();
  const shift = (n) => dayKey(addDays(fromKey(start), n));
  const made = [];
  people.filter((pid) => state.profiles.some((p) => p.id === pid)).forEach((pid) => {
    weeks.forEach((w, i) => {
      const r = routine(pid, name, w.exerciseId, w.minutes, time, { kind: 'sesion', freq, days, since: shift(i * 7), until: shift(i * 7 + 6), source: 'maestra', by, program, week: i + 1, weeks: weeks.length });
      state.routines.push(r);
      made.push(r);
    });
    if (note) state.notes = [...(state.notes || []), stamp({ id: uid(), profile: pid, by, text: String(note).trim().slice(0, 280), at: new Date().toISOString() })];
  });
  save();
  return made;
}

// La semana del programa que toca hoy (o la próxima si todavía no empieza).
export function currentProgram(id) {
  const today = dayKey();
  const weeks = state.routines.filter((r) => r.profile === id && r.program && !r.deletedAt && (!r.until || r.until >= today)).sort((a, b) => a.since.localeCompare(b.since));
  return weeks[0] || null;
}

// Asignar una práctica a varios alumnos a la vez: una rutina por persona, marcada como de la maestra.
export function assignPractice({ people, kind = 'sesion', name, exerciseId, minutes, time, freq = 'daily', days = [], date, note }) {
  const by = state.current;
  const made = people.filter((pid) => state.profiles.some((p) => p.id === pid)).map((pid) => {
    const r = routine(pid, name, kind === 'bolt' ? null : exerciseId, kind === 'bolt' ? 0 : minutes, time, { kind, freq, days, date, source: 'maestra', by });
    state.routines.push(r);
    if (note) state.notes = [...(state.notes || []), stamp({ id: uid(), profile: pid, by, text: String(note).trim().slice(0, 280), at: new Date().toISOString() })];
    return r;
  });
  save();
  return made;
}

export function setCurrent(id) {
  state.current = id;
  save();
}

export function goals(id = state.current) {
  return { bolt: 40, steps: 60, weekly: 150, ...(state.goals[id] || {}) };
}

export function setGoal(id, key, value) {
  const g = goals(id);
  const now = Date.now();
  state.goals[id] = { ...g, [key]: value, at: { ...(g.at || {}), [key]: now }, updatedAt: now };
  save();
}

export const prefs = () => state.prefs;
export function setPref(key, value) {
  state.prefs = { ...state.prefs, [key]: value };
  save();
}

// ---------- Rutinas ----------

// Rutinas vigentes del perfil. Las borradas y las semanas ya terminadas de un programa
// se conservan solo para el historial.
export const routines = (id = state.current) => state.routines.filter((r) => r.profile === id && !r.deletedAt && !(r.until && r.until < dayKey()));
const allRoutines = (id) => state.routines.filter((r) => r.profile === id);

export function addRoutine(r) {
  const me = state.profiles.find((p) => p.id === state.current);
  const forOther = r.profile && r.profile !== state.current;
  const item = routine(r.profile || state.current, r.name, r.exerciseId, r.minutes, r.time, me?.role === 'maestra' && forOther ? { ...r, source: 'maestra', by: me.id } : r);
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
  const me = state.profiles.find((p) => p.id === state.current);
  if (r.source === 'maestra' && me?.role !== 'maestra' && state.profiles.some((p) => p.id === r.profile)) {
    const who = me && me.id !== r.profile ? `${me.name} quitó` : 'Quité';
    state.notes = [...(state.notes || []), stamp({ id: uid(), profile: r.profile, by: r.profile, text: `${who} la práctica que pediste: «${r.name} · ${r.time}».`, at: new Date().toISOString() })];
  }
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
  if (r.until && key > r.until) return false;
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

// ¿Falta más de 3 horas para la rutina? Empezarla así desde su tarjeta no la marca sola
// (si no, la de la noche quedaría hecha en la tarde); hacerla tarde sí cuenta, para ponerse al día.
export function tooEarlyFor(r, when = new Date()) {
  if (!r || r.kind !== 'sesion') return false;
  return minutesOfDay(r.time) - (when.getHours() * 60 + when.getMinutes()) > MATCH_WINDOW;
}

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

// complete: false si se terminó antes del 80 %: se guarda, pero no marca la rutina como cumplida.
export function addSession({ exerciseId, startedAt, durationSec, controlPauses, routineId: wanted = null, complete = true }) {
  const id = state.current;
  const when = new Date(startedAt);
  const before = unlockedBadges(id);
  const routineId = complete ? matchRoutine(id, 'sesion', exerciseId, when, wanted) : null;
  const minutePoints = Math.max(1, Math.floor(durationSec / 60));
  const s = { id: uid(), profile: id, exerciseId, startedAt: when.toISOString(), day: dayKey(when), durationSec: Math.round(durationSec), routineId, controlPauses };
  state.sessions.push(s);
  state.ledger.push({ id: uid(), profile: id, at: s.startedAt, amount: minutePoints, reason: 'minutos' });
  if (routineId) state.ledger.push({ id: uid(), profile: id, at: s.startedAt, amount: 5, reason: 'planeada' });
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
  if (routineId) state.ledger.push({ id: uid(), profile: id, at: m.takenAt, amount: 5, reason: 'planeada' });
  const newBadges = checkBadges(id, before);
  save();
  return { measure: m, prev, newBadges };
}

export const FEELS = ['tranquilo', 'bien', 'costo'];
export function setSessionFeel(sessionId, feel) {
  if (!FEELS.includes(feel)) return;
  state.sessions = state.sessions.map((x) => (x.id === sessionId ? stamp({ ...x, feel }) : x));
  save();
}

// El BOLT con el que se arma el plan: el último de la mañana de las últimas 2 semanas,
// que es el comparable; si no hay, el último que haya.
export function planBolt(id = state.current) {
  const list = bolt(id).slice().sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const since = new Date(); since.setDate(since.getDate() - 14);
  const morning = list.filter((m) => m.morning && new Date(m.takenAt) >= since).at(-1);
  return morning || list.at(-1) || null;
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
  state.ledger.push({ id: uid(), profile: profileId, at: new Date().toISOString(), amount: n, reason: reason || 'reto' });
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
const family = familyMembers;

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
  { id: 'aire20', name: 'Reto del aire 20 s', kidDesc: 'Llega a 20 s en tu reto del aire', desc: 'BOLT de 20 segundos', target: 20, value: bestBolt },
  { id: 'mes', name: 'Mes de calma', desc: '30 días seguidos', target: 30, value: (id) => streak(id) },
  // Para todos.
  { id: 'diez', name: 'Diez respiraciones', desc: '10 sesiones', kidDesc: 'Haz 10 ejercicios de respiración', target: 10, value: (id) => sessions(id).length },
  { id: 'cincuenta', name: 'Cincuenta respiraciones', desc: '50 sesiones', kidDesc: 'Haz 50 ejercicios de respiración', target: 50, value: (id) => sessions(id).length },
  { id: 'hora', name: 'Una hora de calma', desc: '60 minutos en total', kidDesc: 'Junta 60 minutos respirando', target: 60, value: totalMinutes },
  { id: 'cinco-horas', name: 'Cinco horas de calma', desc: '300 minutos en total', kidDesc: 'Junta 300 minutos respirando', target: 300, value: totalMinutes },
  { id: 'quincena', name: 'Dos semanas seguidas', desc: '14 días seguidos', kidDesc: 'Haz ejercicios 14 días seguidos', target: 14, value: (id) => streak(id) },
  { id: 'aire15', name: 'Reto del aire 15 s', kidDesc: 'Llega a 15 s en tu reto del aire', desc: 'BOLT de 15 segundos', target: 15, value: bestBolt },
  { id: 'medidora', name: 'Mido mi aire', desc: 'BOLT medido en 10 días distintos', kidDesc: 'Haz el reto del aire 10 días', target: 10, value: (id) => new Set(bolt(id).map((m) => m.day)).size },
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
  { id: 'tres-retos', name: 'Tres retos del aire', desc: 'Reto del aire en 3 días distintos', kidDesc: 'Haz el reto del aire 3 días', target: 3, kinds: PEQUE, value: (id) => new Set(bolt(id).map((m) => m.day)).size },
  { id: 'doble', name: 'Dos veces en un día', desc: '2 sesiones el mismo día', kidDesc: 'Haz 2 ejercicios en un día', target: 2, kinds: PEQUE, value: bestDay },
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
      state.ledger.push({ id: `ins-${id}-${b.id}`, profile: id, at: new Date().toISOString(), amount: 10, reason: 'insignia' });
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
    state.ledger.push({ id: `ins-${p.id}-equipo`, profile: p.id, at, amount: 10, reason: 'insignia' });
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
  looseBolt.forEach((m) => {
    items.push({ type: 'extra', status: 'extra', time: clockOf(m.takenAt), title: 'BOLT', exercise: null, minutes: 0, measure: m });
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
  try { data = cleanState(JSON.parse(text)); } catch (e) { return false; }
  if (!data || !data.profiles.length) return false;
  const current = state.current;
  state = data;
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

// La meta de pasos de los adultos bajó de 80 a 60 (la serie guarda pasos con falta de aire moderada).
// Solo cambia a quien sigue con el 80 de fábrica: si alguien la ajustó a mano, se respeta.
// La fecha fija hace que todos los teléfonos lleguen al mismo resultado al juntar metas.
// Va dentro de la función porque load() la usa antes de que se lea el resto del módulo.
function stepsGoal60(st) {
  const STEPS_60_AT = Date.UTC(2026, 10, 3);
  (st.profiles || []).forEach((p) => {
    const g = st.goals?.[p.id];
    if (p.kind === 'adulto' && g && g.steps === 80 && !g.at?.steps) st.goals[p.id] = { ...g, steps: 60, at: { ...(g.at || {}), steps: STEPS_60_AT } };
  });
  return st;
}

const DEFAULT_GOALS = {
  adulto: { bolt: 40, steps: 60, weekly: 150 },
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
  // El único adulto no puede dejar de serlo: la familia siempre tiene un adulto que la administre.
  const target = state.profiles.find((p) => p.id === id);
  const adults = state.profiles.filter((p) => p.kind === 'adulto' && p.role !== 'maestra');
  if (target?.kind === 'adulto' && patch.kind && patch.kind !== 'adulto' && adults.length <= 1) return false;
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
  return true;
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
  // Si se fue el único administrador, otro adulto toma su lugar.
  if (!state.profiles.some((x) => x.kind === 'adulto' && x.admin)) {
    const next = state.profiles.find((x) => x.kind === 'adulto' && x.role !== 'maestra');
    if (next) state.profiles = state.profiles.map((x) => (x.id === next.id ? stamp({ ...x, admin: true }) : x));
  }
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
  state.familyNameAt = Date.now();
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

// ---------- Limpieza de datos que llegan de fuera ----------
// Servidor, otro teléfono o un respaldo importado: solo pasan registros con la forma esperada.
// Así un dato raro nunca termina como código en la pantalla.
const ID = /^[\w-]{1,64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RESERVED = new Set(['__proto__', 'constructor', 'prototype']);
const isId = (v) => typeof v === 'string' && ID.test(v) && !RESERVED.has(v);
const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const day = (v) => (typeof v === 'string' && DAY.test(v) ? v : undefined);
const iso = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : undefined);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const KINDS = ['adulto', 'junior', 'peque'];
const idMap = (o, fn) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([k]) => isId(k)).map(([k, v]) => [k, fn(v)]).filter(([, v]) => v !== undefined));
const list = (v, fn) => (Array.isArray(v) ? v.map(fn).filter(Boolean) : []);
const opt = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export function cleanState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  // Un ejercicio que esta versión no conoce (de una versión más nueva) se conserva.
  const exercise = (v) => (isId(v) ? v : null);
  return stepsGoal60({
    ...seed(),
    v: 1,
    familyName: str(raw.familyName, 40),
    familyNameAt: num(raw.familyNameAt),
    aliases: idMap(raw.aliases, (v) => (isId(v) ? v : undefined)),
    profiles: list(raw.profiles, (p) => (p && isId(p.id) && str(p.name, 40).trim() ? opt({
      id: p.id, name: str(p.name, 40).trim(), kind: oneOf(p.kind, KINDS, 'adulto'), age: p.age ? num(p.age) : undefined,
      admin: !!p.admin, role: p.role === 'maestra' ? 'maestra' : undefined, updatedAt: num(p.updatedAt),
    }) : null)),
    goals: idMap(raw.goals, (g) => (g && typeof g === 'object' ? opt({
      bolt: num(g.bolt, 40), steps: num(g.steps, 60), weekly: num(g.weekly, 150), updatedAt: num(g.updatedAt),
      at: g.at && typeof g.at === 'object' ? Object.fromEntries(['bolt', 'steps', 'weekly'].filter((k) => Number.isFinite(g.at[k])).map((k) => [k, g.at[k]])) : undefined,
    }) : undefined)),
    routines: list(raw.routines, (r) => (r && isId(r.id) && isId(r.profile) ? opt({
      id: r.id, profile: r.profile, kind: oneOf(r.kind, ['sesion', 'bolt'], 'sesion'), name: str(r.name, 40), exerciseId: exercise(r.exerciseId),
      minutes: num(r.minutes), time: /^\d{2}:\d{2}$/.test(r.time || '') ? r.time : '07:00', freq: oneOf(r.freq, ['daily', 'weekdays', 'days', 'once'], 'daily'),
      days: list(r.days, (d) => (Number.isInteger(d) && d >= 0 && d <= 6 ? d + 1 : 0)).map((d) => d - 1),
      active: r.active !== false, since: day(r.since), deletedAt: day(r.deletedAt), pausedFrom: day(r.pausedFrom), date: day(r.date), updatedAt: num(r.updatedAt),
      source: r.source === 'maestra' ? 'maestra' : undefined, by: isId(r.by) ? r.by : undefined,
      until: day(r.until), program: isId(r.program) ? r.program : undefined,
      week: Number.isInteger(r.week) && r.week > 0 ? r.week : undefined, weeks: Number.isInteger(r.weeks) && r.weeks > 0 ? r.weeks : undefined,
    }) : null)),
    notes: list(raw.notes, (n) => (n && isId(n.id) && isId(n.profile) && iso(n.at) && str(n.text, 280).trim() ? opt({
      id: n.id, profile: n.profile, by: isId(n.by) ? n.by : undefined, text: str(n.text, 280), at: n.at, readAt: iso(n.readAt), updatedAt: num(n.updatedAt),
    }) : null)),
    sessions: list(raw.sessions, (s) => (s && isId(s.id) && isId(s.profile) && isId(s.exerciseId) && iso(s.startedAt) ? opt({
      id: s.id, profile: s.profile, exerciseId: s.exerciseId, startedAt: s.startedAt, day: day(s.day) || dayKey(new Date(s.startedAt)),
      durationSec: num(s.durationSec), routineId: isId(s.routineId) ? s.routineId : null,
      controlPauses: Array.isArray(s.controlPauses) ? list(s.controlPauses, (v) => (Number.isFinite(v) ? v + 1 : 0)).map((v) => v - 1) : undefined, updatedAt: num(s.updatedAt),
      feel: FEELS.includes(s.feel) ? s.feel : undefined,
    }) : null)),
    bolt: list(raw.bolt, (m) => (m && isId(m.id) && isId(m.profile) && iso(m.takenAt) ? opt({
      id: m.id, profile: m.profile, takenAt: m.takenAt, day: day(m.day) || dayKey(new Date(m.takenAt)), seconds: num(m.seconds),
      morning: !!m.morning, note: str(m.note, 140), routineId: isId(m.routineId) ? m.routineId : null, updatedAt: num(m.updatedAt),
    }) : null)),
    steps: list(raw.steps, (m) => (m && isId(m.id) && isId(m.profile) && iso(m.takenAt) ? opt({
      id: m.id, profile: m.profile, takenAt: m.takenAt, day: day(m.day) || dayKey(new Date(m.takenAt)), steps: num(m.steps), seconds: num(m.seconds),
      type: oneOf(m.type, ['max', 'serie'], 'serie'), series: Array.isArray(m.series) ? m.series.map((v) => num(v)) : undefined, updatedAt: num(m.updatedAt),
    }) : null)),
    ledger: list(raw.ledger, (l) => (l && isId(l.profile) && iso(l.at) ? opt({ id: isId(l.id) ? l.id : undefined, profile: l.profile, at: l.at, amount: num(l.amount), reason: str(l.reason, 40) }) : null)),
    badges: idMap(raw.badges, (b) => (b && typeof b === 'object' ? Object.fromEntries(Object.entries(b).filter(([k, v]) => isId(k) && iso(v))) : undefined)),
    rewards: !Array.isArray(raw.rewards) ? defaultRewards() : list(raw.rewards, (r) => (r && isId(r.id) && str(r.name, 60).trim() ? opt({ id: r.id, name: str(r.name, 60), cost: Math.max(5, num(r.cost, 100)), active: r.active !== false, updatedAt: num(r.updatedAt) }) : null)),
    redemptions: list(raw.redemptions, (r) => (r && isId(r.id) && isId(r.profile) && iso(r.requestedAt) ? opt({
      id: r.id, profile: r.profile, rewardId: isId(r.rewardId) ? r.rewardId : '', name: str(r.name, 60), cost: num(r.cost),
      status: oneOf(r.status, ['pendiente', 'aprobado', 'pospuesto'], 'pendiente'), requestedAt: r.requestedAt,
      decidedAt: iso(r.decidedAt) || (r.status === 'aprobado' || r.status === 'pospuesto' ? r.requestedAt : undefined),
      decidedBy: isId(r.decidedBy) ? r.decidedBy : undefined, updatedAt: num(r.updatedAt),
    }) : null)),
    removed: idMap(raw.removed, (v) => (Number.isFinite(v) ? v : undefined)),
    prefs: (() => {
      const p = raw.prefs && typeof raw.prefs === 'object' ? raw.prefs : {};
      return {
        tones: p.tones !== false, music: num(p.music, 60), nature: num(p.nature, 45), tonesVol: num(p.tonesVol, 80),
        ambient: AMBIENTS.some((a) => a.id === p.ambient) ? p.ambient : 'bosque',
        lastDur: Object.fromEntries(Object.entries(p.lastDur && typeof p.lastDur === 'object' ? p.lastDur : {}).filter(([k, v]) => byId(k) && Number.isFinite(v))),
        pins: idMap(p.pins, (v) => (typeof v === 'string' && /^\d{4}$/.test(v) ? v : undefined)),
        pinsAt: idMap(p.pinsAt, (v) => (Number.isFinite(v) ? v : undefined)),
      };
    })(),
    updatedAt: num(raw.updatedAt),
  });
}

// Lo borrado (perfiles y rutinas sin historia) se recuerda para que otro teléfono no lo reviva.
function forget(id) {
  state.removed = { ...(state.removed || {}), [id]: Date.now() };
}

const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Cambia ids de persona en todo un estado (perfiles y todo lo que apunta a ellos).
function renameIds(st, map) {
  if (!Object.keys(map).length) return st;
  const re = (id) => map[id] || id;
  const reKeys = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [re(k), v]));
  const who = (x) => ({ ...x, profile: re(x.profile), ...(x.by ? { by: re(x.by) } : {}), ...(x.decidedBy ? { decidedBy: re(x.decidedBy) } : {}) });
  return {
    ...st,
    current: st.current ? re(st.current) : st.current,
    profiles: (st.profiles || []).map((p) => ({ ...p, id: re(p.id) })),
    goals: reKeys(st.goals),
    badges: reKeys(st.badges),
    removed: reKeys(st.removed),
    routines: (st.routines || []).map(who),
    sessions: (st.sessions || []).map(who),
    bolt: (st.bolt || []).map(who),
    steps: (st.steps || []).map(who),
    // El id de la hoja de una insignia lleva el id de la persona.
    ledger: (st.ledger || []).map((l) => ({ ...who(l), ...(l.id && l.id.startsWith('ins-') && map[l.profile] ? { id: l.id.replace(`ins-${l.profile}-`, `ins-${map[l.profile]}-`) } : {}) })),
    redemptions: (st.redemptions || []).map(who),
    notes: (st.notes || []).map(who),
    prefs: { ...(st.prefs || {}), pins: reKeys(st.prefs?.pins), pinsAt: reKeys(st.prefs?.pinsAt) },
  };
}

// La misma persona siempre termina con un solo id en todos los teléfonos: el del servidor.
// Si este teléfono la tenía con otro id (mismo nombre), adopta el del servidor y lo anota
// en aliases para que cualquier otro teléfono con el id viejo también se corrija.
function unifyIds(remote) {
  const aliases = { ...(remote.aliases || {}), ...(state.aliases || {}) };
  const resolve = (id) => { let x = id; for (let i = 0; i < 5 && aliases[x]; i++) x = aliases[x]; return x; };
  const known = new Set((remote.profiles || []).map((p) => p.id));
  const byName = new Map((remote.profiles || []).map((p) => [norm(p.name), p.id]));
  state.profiles.forEach((p) => {
    const theirs = byName.get(norm(p.name));
    if (!known.has(p.id) && theirs && theirs !== p.id) aliases[p.id] = theirs;
  });
  const flat = Object.fromEntries(Object.keys(aliases).map((k) => [k, resolve(k)]).filter(([k, v]) => k !== v));
  const fresh = Object.keys(flat).filter((k) => !(state.aliases || {})[k] && state.profiles.some((p) => p.id === k));
  if (fresh.length) {
    state.profiles = state.profiles.map((p) => (fresh.includes(p.id) ? { ...p, updatedAt: 0 } : p));
    if (remote.familyName) state.familyNameAt = 0;
  }
  state = renameIds(state, flat);
  state.aliases = flat;
  return renameIds({ ...remote, aliases: flat }, flat);
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

// Dos rutinas iguales (misma persona, hora, ejercicio y días) son una sola. Gana la que ya
// está en el servidor (o el id menor); la otra queda borrada para que no reviva en otro teléfono.
function dedupeRoutines(list, records, remoteIds, removed) {
  const groups = new Map();
  list.forEach((r) => {
    if (r.deletedAt) return;
    // Las semanas de un programa se parecen (mismo ejercicio y hora) pero no son copias.
    const key = JSON.stringify([r.profile, r.kind, r.name, r.time, r.exerciseId || null, r.freq, r.days || [], r.date || null, r.program || null, r.week || null]);
    groups.set(key, [...(groups.get(key) || []), r.id]);
  });
  const moved = {};
  groups.forEach((ids) => {
    if (ids.length < 2) return;
    const winner = [...ids].sort((a, b) => (remoteIds.has(b) - remoteIds.has(a)) || a.localeCompare(b))[0];
    ids.filter((x) => x !== winner).forEach((x) => { moved[x] = winner; removed[x] = removed[x] || Date.now(); });
  });
  Object.keys(records).forEach((k) => {
    records[k] = records[k].map((x) => (moved[x.routineId] ? { ...x, routineId: moved[x.routineId] } : x));
  });
  return list.filter((r) => !moved[r.id]);
}

// Metas: cada meta (BOLT, pasos, minutos) gana por su propia hora de cambio.
function mergeGoals(local = {}, remote = {}) {
  const out = {};
  new Set([...Object.keys(local), ...Object.keys(remote)]).forEach((pid) => {
    const l = local[pid] || {};
    const r = remote[pid] || {};
    const at = (g, k) => {
      if (!g.at) return g.updatedAt || 0;
      const latest = Math.max(0, ...Object.values(g.at));
      return (g.updatedAt || 0) > latest ? g.updatedAt : (g.at[k] || 0);
    };
    const g = { at: {} };
    ['bolt', 'steps', 'weekly'].forEach((k) => {
      const src = at(r, k) > at(l, k) ? r : (k in l ? l : r);
      if (src[k] !== undefined) g[k] = src[k];
      if (at(src, k)) g.at[k] = at(src, k);
    });
    g.updatedAt = Math.max(l.updatedAt || 0, r.updatedAt || 0);
    out[pid] = g;
  });
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
  const cleaned = cleanState(incoming);
  if (!cleaned) return;
  const remote = unifyIds(cleaned);
  const removed = { ...(remote.removed || {}), ...(state.removed || {}) };
  const alive = (x) => !removed[x.id] && !removed[x.profile];
  // Las hojas viejas no tienen id: se juntan por persona, hora, motivo y monto.
  const ledgerKey = (l) => l.id || `${l.profile}|${l.at}|${l.reason}|${l.amount}`;
  const records = {
    sessions: newest(state.sessions, remote.sessions, alive),
    bolt: newest(state.bolt, remote.bolt, alive),
  };
  const remoteRoutineIds = new Set((remote.routines || []).map((r) => r.id));
  const routines = dedupeRoutines(newest(state.routines, remote.routines, alive), records, remoteRoutineIds, removed);
  const badges = { ...(remote.badges || {}) };
  Object.entries(state.badges || {}).forEach(([pid, got]) => {
    const theirs = badges[pid] || {};
    badges[pid] = { ...theirs };
    Object.entries(got).forEach(([b, at]) => { badges[pid][b] = theirs[b] && theirs[b] < at ? theirs[b] : at; });
  });
  const nameFromRemote = (remote.familyNameAt || 0) > (state.familyNameAt || 0) || !state.familyName;
  const merged = {
    ...remote,
    familyName: nameFromRemote ? remote.familyName : state.familyName,
    familyNameAt: Math.max(remote.familyNameAt || 0, state.familyNameAt || 0),
    aliases: { ...(remote.aliases || {}), ...(state.aliases || {}) },
    profiles: newest(state.profiles, remote.profiles, alive),
    routines,
    ...records,
    steps: newest(state.steps, remote.steps, alive),
    ledger: union(state.ledger, remote.ledger, ledgerKey).filter(alive),
    rewards: newest(state.rewards, remote.rewards, alive),
    redemptions: mergeRedemptions(state.redemptions, remote.redemptions).filter(alive),
    notes: newest(state.notes, remote.notes, alive),
    goals: mergeGoals(state.goals, remote.goals),
    badges,
    removed,
    prefs: { ...(remote.prefs || {}), ...state.prefs, ...mergePins(state.prefs, remote.prefs) },
  };
  replaceState(merged, Date.now());
}

// La maestra adopta lo que el servidor guardó (ya filtrado); conserva solo su sonido.
export function adoptServer(raw, updatedAt) {
  const cleaned = cleanState(raw);
  if (!cleaned) return;
  replaceState({ ...cleaned, prefs: { ...cleaned.prefs, ...state.prefs, pins: cleaned.prefs.pins, pinsAt: cleaned.prefs.pinsAt } }, updatedAt);
}

// ¿Este teléfono tiene algo que el servidor no? (para no reescribir la hoja sin cambios)
export function differsFrom(raw) {
  const a = cleanState(raw);
  const b = cleanState(snapshot().state);
  if (!a || !b) return true;
  a.updatedAt = 0;
  b.updatedAt = 0;
  return JSON.stringify(a) !== JSON.stringify(b);
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
