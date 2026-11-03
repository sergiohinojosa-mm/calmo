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

function routine(profile, name, exerciseId, minutes, time, extra = {}) {
  return { id: uid(), profile, kind: 'sesion', name, exerciseId, minutes, time, freq: 'daily', days: [], active: true, since: dayKey(), ...extra };
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

export function setCurrent(id) {
  state.current = id;
  save();
}

export function goals(id = state.current) {
  return { bolt: 40, steps: 80, weekly: 150, ...(state.goals[id] || {}) };
}

export function setGoal(id, key, value) {
  state.goals[id] = { ...goals(id), [key]: value };
  save();
}

export const prefs = () => state.prefs;
export function setPref(key, value) {
  state.prefs = { ...state.prefs, [key]: value };
  save();
}

// ---------- Rutinas ----------

export const routines = (id = state.current) => state.routines.filter((r) => r.profile === id);

export function addRoutine(r) {
  const item = routine(r.profile || state.current, r.name, r.exerciseId, r.minutes, r.time, r);
  item.id = uid();
  state.routines.push(item);
  save();
  return item;
}

export function updateRoutine(id, patch) {
  state.routines = state.routines.map((r) => (r.id === id ? { ...r, ...patch } : r));
  save();
}

export function removeRoutine(id) {
  state.routines = state.routines.filter((r) => r.id !== id);
  save();
}

export function routineApplies(r, date) {
  if (!r.active) return false;
  const key = dayKey(date);
  if (r.since && key < r.since) return false;
  if (r.freq === 'once') return r.date === key;
  if (r.freq === 'daily') return true;
  if (r.freq === 'weekdays') return dow(date) < 5;
  if (r.freq === 'days') return (r.days || []).includes(dow(date));
  return false;
}

export function routinesOn(id, date) {
  return routines(id).filter((r) => routineApplies(r, date)).sort((a, b) => a.time.localeCompare(b.time));
}

function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function matchRoutine(id, kind, exerciseId, when) {
  const key = dayKey(when);
  const taken = new Set([...state.sessions, ...state.bolt].filter((s) => s.profile === id && s.day === key && s.routineId).map((s) => s.routineId));
  const now = when.getHours() * 60 + when.getMinutes();
  const candidates = routinesOn(id, when).filter((r) => r.kind === kind && !taken.has(r.id) && (kind === 'bolt' || r.exerciseId === exerciseId));
  candidates.sort((a, b) => Math.abs(minutesOfDay(a.time) - now) - Math.abs(minutesOfDay(b.time) - now));
  return candidates[0]?.id || null;
}

// ---------- Sesiones, hojas e insignias ----------

export const sessions = (id = state.current) => state.sessions.filter((s) => s.profile === id);

export function addSession({ exerciseId, startedAt, durationSec, controlPauses }) {
  const id = state.current;
  const when = new Date(startedAt);
  const before = unlockedBadges(id);
  const routineId = matchRoutine(id, 'sesion', exerciseId, when);
  const minutePoints = Math.max(1, Math.floor(durationSec / 60));
  const s = { id: uid(), profile: id, exerciseId, startedAt: when.toISOString(), day: dayKey(when), durationSec: Math.round(durationSec), routineId, controlPauses };
  state.sessions.push(s);
  state.ledger.push({ profile: id, at: s.startedAt, amount: minutePoints, reason: 'minutos' });
  if (routineId) state.ledger.push({ profile: id, at: s.startedAt, amount: 5, reason: 'planeada' });
  const newBadges = checkBadges(id, before);
  save();
  return { session: s, minutePoints, plannedPoints: routineId ? 5 : 0, newBadges, routine: state.routines.find((r) => r.id === routineId) };
}

export function addBolt({ seconds, morning, note }) {
  const id = state.current;
  const when = new Date();
  const before = unlockedBadges(id);
  const routineId = matchRoutine(id, 'bolt', null, when);
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
  return new Set(sessions(id).map((s) => s.day));
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
function familyMet() {
  const sum = state.profiles.reduce((a, p) => a + last7(p.id), 0);
  const goal = state.profiles.reduce((a, p) => a + (goals(p.id).weekly || 0), 0);
  return goal > 0 && sum >= goal;
}

// ---------- Insignias ----------

export const BADGES = [
  { id: 'primera', name: 'Primera respiración', desc: 'Tu primera sesión', target: 1, value: (id) => sessions(id).length },
  { id: 'brote', name: 'Brote constante', desc: '3 días seguidos', target: 3, value: (id) => streak(id) },
  { id: 'semana', name: 'Semana de hojas', desc: '7 días seguidos', target: 7, value: (id) => streak(id) },
  { id: 'madrugada', name: 'Al despertar', desc: '5 sesiones antes de las 9:00', target: 5, value: (id) => sessions(id).filter((s) => new Date(s.startedAt).getHours() < 9).length },
  { id: 'buho', name: 'Búho sereno', desc: '5 sesiones después de las 20:00', target: 5, value: (id) => sessions(id).filter((s) => new Date(s.startedAt).getHours() >= 20).length },
  { id: 'despejada', name: 'Nariz despejada', desc: 'Haz «Destapar la nariz» 3 veces', kidDesc: 'Destapa tu nariz 3 veces', target: 3, value: (id) => sessions(id).filter((s) => s.exerciseId === 'destapar').length },
  { id: 'equipo', name: 'Equipo en familia', desc: 'La familia llegó a su meta de 7 días', kidDesc: 'Toda la familia llegó a su meta', target: 1, value: () => (familyMet() ? 1 : 0) },
  { id: 'exploradora', name: 'Exploradora', desc: '5 ejercicios distintos', target: 5, value: (id) => new Set(sessions(id).map((s) => s.exerciseId)).size },
  { id: 'cumplida', name: 'Rutina cumplida', desc: '14 sesiones planeadas', target: 14, value: (id) => sessions(id).filter((s) => s.routineId).length },
  { id: 'caminante', name: 'Caminante', desc: '50 pasos sin respirar', target: 50, value: (id) => bestSteps(id) },
  { id: 'aire20', name: 'Reto del aire 20 s', kidDesc: 'Aguanta 20 s tranquila', desc: 'BOLT de 20 segundos', target: 20, value: (id) => bolt(id).reduce((a, m) => Math.max(a, m.seconds), 0) },
  { id: 'mes', name: 'Mes de calma', desc: '30 días seguidos', target: 30, value: (id) => streak(id) },
];

export function unlockedBadges(id = state.current) {
  return { ...(state.badges[id] || {}) };
}

function checkBadges(id, before) {
  const fresh = [];
  state.badges[id] = state.badges[id] || {};
  for (const b of BADGES) {
    if (before[b.id]) continue;
    if (b.value(id) >= b.target) {
      state.badges[id][b.id] = new Date().toISOString();
      state.ledger.push({ profile: id, at: new Date().toISOString(), amount: 10, reason: 'insignia' });
      fresh.push(b);
    }
  }
  return fresh;
}

export function badgeStatus(id = state.current) {
  const got = unlockedBadges(id);
  return BADGES.map((b) => ({ ...b, earned: !!got[b.id], earnedAt: got[b.id], current: Math.min(b.value(id), b.target) }));
}

// ---------- Agenda del calendario ----------

export function agenda(id, date) {
  const key = dayKey(date);
  const today = dayKey();
  const daySessions = sessions(id).filter((s) => s.day === key);
  const dayBolt = bolt(id).filter((m) => m.day === key);
  const items = routinesOn(id, date).map((r) => {
    const done = r.kind === 'bolt' ? dayBolt.find((m) => m.routineId === r.id) : daySessions.find((s) => s.routineId === r.id);
    let status = 'pendiente';
    if (done) status = 'hecha';
    else if (key < today) status = 'no';
    const ex = r.exerciseId ? byId(r.exerciseId) : null;
    return { type: 'plan', routine: r, status, time: r.time, title: r.name, exercise: ex, minutes: r.minutes };
  });
  daySessions.filter((s) => !s.routineId).forEach((s) => {
    const d = new Date(s.startedAt);
    items.push({ type: 'extra', status: 'extra', time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, title: byId(s.exerciseId)?.name || 'Sesión', exercise: byId(s.exerciseId), minutes: Math.round(s.durationSec / 60), session: s });
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- Datos ----------

export function exportJSON() {
  return JSON.stringify(state, null, 2);
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
  state.prefs = { ...state.prefs, pins: { ...(state.prefs.pins || {}), [id]: pin } };
  save();
}

export function clearPin(id) {
  const pins = { ...(state.prefs.pins || {}) };
  delete pins[id];
  state.prefs = { ...state.prefs, pins };
  save();
}

// ---------- Administrar perfiles ----------

const DEFAULT_GOALS = {
  adulto: { bolt: 40, steps: 80, weekly: 150 },
  junior: { bolt: 20, steps: 40, weekly: 40 },
  peque: { bolt: 10, steps: 20, weekly: 10 },
};

export function addProfile({ name, kind = 'junior', age }) {
  const p = { id: uid(), name: name.trim(), kind, age: age ? Number(age) : undefined, admin: false };
  state.profiles.push(p);
  state.goals[p.id] = { ...DEFAULT_GOALS[kind] };
  save();
  return p;
}

export function updateProfile(id, patch) {
  state.profiles = state.profiles.map((p) => (p.id === id ? { ...p, ...patch, age: patch.age !== undefined ? (patch.age ? Number(patch.age) : undefined) : p.age } : p));
  save();
}

// Quita el perfil y sus datos. Nunca deja la app sin un adulto.
export function removeProfile(id) {
  const p = profile(id);
  const adults = state.profiles.filter((x) => x.kind === 'adulto');
  if (!p || (p.kind === 'adulto' && adults.length <= 1)) return false;
  state.profiles = state.profiles.filter((x) => x.id !== id);
  ['routines', 'sessions', 'bolt', 'steps', 'ledger'].forEach((k) => { state[k] = state[k].filter((x) => x.profile !== id); });
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

const SUGGESTED = {
  adulto: [['Al despertar', 'coherente', 10, '05:30'], ['Antes de dormir', 'coherente', 10, '21:00']],
  junior: [['Antes de dormir', 'ligero', 5, '20:30']],
  peque: [['Antes de dormir', 'flor', 1, '20:00']],
};

// people: [{ name, kind, age }]. El primer adulto queda como perfil activo y administrador.
export function setupFamily({ family, people, withRoutines }) {
  state.familyName = (family || '').trim();
  people.forEach((x) => {
    const p = { id: uid(), name: x.name.trim(), kind: x.kind, age: x.age ? Number(x.age) : undefined, admin: x.kind === 'adulto' };
    state.profiles.push(p);
    state.goals[p.id] = { ...DEFAULT_GOALS[p.kind] };
    if (withRoutines) {
      SUGGESTED[p.kind].forEach(([name, exerciseId, minutes, time]) => state.routines.push(routine(p.id, name, exerciseId, minutes, time)));
      if (p.kind === 'adulto') state.routines.push(routine(p.id, 'Medir BOLT', null, 0, '05:15', { kind: 'bolt', freq: 'days', days: [0] }));
    }
  });
  state.current = (state.profiles.find((p) => p.kind === 'adulto') || state.profiles[0]).id;
  save();
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

// Junta lo del servidor con lo de este teléfono sin perder sesiones ni mediciones.
export function mergeRemote(remote) {
  if (!remote) return;
  const id = (x) => x.id;
  const ledgerKey = (l) => `${l.profile}|${l.at}|${l.reason}|${l.amount}`;
  const merged = {
    ...remote,
    familyName: state.familyName || remote.familyName,
    profiles: union(state.profiles, remote.profiles, id),
    routines: union(state.routines, remote.routines, id),
    sessions: union(state.sessions, remote.sessions, id),
    bolt: union(state.bolt, remote.bolt, id),
    steps: union(state.steps, remote.steps, id),
    ledger: union(state.ledger, remote.ledger, ledgerKey),
    goals: { ...(remote.goals || {}), ...state.goals },
    badges: { ...(remote.badges || {}), ...state.badges },
    prefs: { ...(remote.prefs || {}), ...state.prefs },
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
