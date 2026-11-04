/**
 * Calmo · servidor de la familia (Google Apps Script).
 *
 * Guarda los datos de la familia en la hoja "Calmo · datos" de quien lo
 * instala y controla el ingreso con usuario y contraseña. Las contraseñas se
 * guardan como huella SHA-256 con sal, nunca en texto; los tokens de sesión,
 * también como huella.
 *
 * Roles: admin (todo, da de alta usuarios), adulto (los datos de la familia) y
 * maestra (ve el avance; solo cambia rutinas, metas, notas y su propia práctica;
 * no recibe PIN ni premios).
 *
 * Instalación: ver backend/LEEME.md.
 */

const BOOK_NAME = 'Calmo · datos';
const SESSION_DAYS = 180;
const CHUNK = 45000; // una celda admite ~50 000 caracteres
const MAX_STATE = 1000000; // 1 MB de datos de la familia como máximo
const ROLES = ['admin', 'adulto', 'maestra'];
const USER_RE = /^[a-z0-9._-]{2,30}$/;

// ---------- Entrada ----------

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = route_(req);
  } catch (err) {
    out = { ok: false, error: 'Algo salió mal en el servidor. Intenta de nuevo.' };
    console.error(err && err.stack || err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, app: 'Calmo' })).setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  switch (req.action) {
    case 'estado': return { ok: true, hayUsuarios: users_().length > 0 };
    case 'crearAdmin': return createAdmin_(req);
    case 'ingresar': return login_(req);
  }
  const me = session_(req.token);
  if (!me) return { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.', sesion: false };
  switch (req.action) {
    case 'yo': return { ok: true, usuario: publicUser_(me) };
    case 'cargar': return load_(me);
    case 'guardar': return save_(me, req);
    case 'salir': dropSession_(req.token); return { ok: true };
    case 'cambiarClave': return changePassword_(me, req);
    case 'usuarios': return requireAdmin_(me) || { ok: true, usuarios: users_().map(publicUser_) };
    case 'guardarUsuario': return requireAdmin_(me) || locked_(() => upsertUser_(me, req));
    case 'quitarUsuario': return requireAdmin_(me) || locked_(() => removeUser_(me, req));
  }
  return { ok: false, error: 'Acción desconocida.' };
}

function locked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- Hoja ----------

// La hoja se crea una sola vez. Si ya existe y no abre (un error pasajero de Google),
// se avisa en lugar de crear otra vacía: así nadie puede "reiniciar" el servidor.
function book_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('BOOK_ID');
  if (id) return SpreadsheetApp.openById(id);
  const book = SpreadsheetApp.create(BOOK_NAME);
  const first = book.getSheets()[0];
  first.setName('usuarios');
  first.appendRow(['usuario', 'nombre', 'rol', 'sal', 'huella', 'creado']);
  book.insertSheet('sesiones').appendRow(['token', 'usuario', 'expira']);
  book.insertSheet('estado').appendRow(['parte', 'json']);
  book.insertSheet('meta').appendRow(['clave', 'valor']);
  props.setProperty('BOOK_ID', book.getId());
  return book;
}

function sheet_(name) {
  return book_().getSheetByName(name);
}

function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  const head = values.shift();
  return values.map((r, i) => {
    const o = { _row: i + 2 };
    head.forEach((h, k) => { o[h] = r[k]; });
    return o;
  });
}

function meta_(key, value) {
  const sh = sheet_('meta');
  const found = rows_('meta').find((r) => r.clave === key);
  if (value === undefined) return found ? found.valor : null;
  if (found) sh.getRange(found._row, 2).setValue(value);
  else sh.appendRow([key, value]);
  return value;
}

// Nada que empiece con = + - @ entra a la hoja como fórmula.
function safeText_(v) {
  return String(v == null ? '' : v).replace(/^[=+\-@\s]+/, '').slice(0, 60);
}

// ---------- Usuarios y contraseñas ----------

function normalize_(u) {
  return String(u || '').trim().toLowerCase();
}

function users_() {
  return rows_('usuarios').filter((r) => r.usuario);
}

function publicUser_(u) {
  return { usuario: u.usuario, nombre: u.nombre, rol: u.rol };
}

function digest_(salt, password) {
  let bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8);
  for (let i = 0; i < 2000; i++) {
    bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes.concat(Utilities.newBlob(salt).getBytes()));
  }
  return Utilities.base64Encode(bytes);
}

// Las huellas nuevas llevan el prefijo h1: (una huella que empieza con + no se vuelve fórmula).
function hashOf_(salt, password) {
  return 'h1:' + digest_(salt, password);
}

function passwordMatches_(u, password) {
  const d = digest_(u.sal, String(password || ''));
  return u.huella === d || u.huella === 'h1:' + d;
}

function validPassword_(p) {
  return typeof p === 'string' && p.length >= 6;
}

function validUser_(usuario) {
  return USER_RE.test(usuario);
}

function createAdmin_(req) {
  return locked_(() => {
    if (users_().length) return { ok: false, error: 'Ya existe una cuenta de administrador.' };
    const usuario = normalize_(req.usuario);
    const nombre = safeText_(req.nombre).trim();
    if (!validUser_(usuario) || !nombre) return { ok: false, error: 'Escribe tu nombre y un usuario (letras y números, sin espacios).' };
    if (!validPassword_(req.password)) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    const salt = Utilities.getUuid();
    sheet_('usuarios').appendRow([usuario, nombre, 'admin', salt, hashOf_(salt, req.password), new Date()]);
    return { ok: true, token: newSession_(usuario), usuario: { usuario, nombre, rol: 'admin' } };
  });
}

// El contador de intentos se lee y escribe bajo candado; con un usuario que no existe
// también se calcula una huella, para que el tiempo de respuesta no lo delate.
function login_(req) {
  const usuario = normalize_(req.usuario);
  return locked_(() => {
    const cache = CacheService.getScriptCache();
    const key = 'fallas:' + usuario;
    const fails = Number(cache.get(key) || 0);
    if (fails >= 5) return { ok: false, error: 'Demasiados intentos. Espera 10 minutos y vuelve a intentar.' };
    const u = users_().find((x) => x.usuario === usuario);
    const ok = u ? passwordMatches_(u, req.password) : (digest_('calmo', String(req.password || '')), false);
    if (!ok) {
      cache.put(key, String(fails + 1), 600);
      return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    }
    cache.remove(key);
    pruneSessions_();
    return { ok: true, token: newSession_(usuario), usuario: publicUser_(u) };
  });
}

// ---------- Sesiones ----------
// En la hoja solo queda la huella del token, nunca el token.

function tokenHash_(token) {
  return 'h1:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token), Utilities.Charset.UTF_8));
}

function newSession_(usuario) {
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const expira = new Date(Date.now() + SESSION_DAYS * 864e5);
  sheet_('sesiones').appendRow([tokenHash_(token), usuario, expira]);
  return token;
}

function findSession_(token) {
  if (!token) return null;
  const h = tokenHash_(token);
  return rows_('sesiones').find((r) => r.token === h || r.token === token) || null;
}

function session_(token) {
  const s = findSession_(token);
  if (!s || new Date(s.expira) < new Date()) return null;
  return users_().find((u) => u.usuario === s.usuario) || null;
}

function dropSession_(token) {
  locked_(() => {
    const s = findSession_(token);
    if (s) sheet_('sesiones').deleteRow(s._row);
  });
}

// Cierra las sesiones de un usuario (todas, o todas menos la actual).
function dropSessionsOf_(usuario, keepToken) {
  const keep = keepToken ? tokenHash_(keepToken) : null;
  rows_('sesiones').filter((s) => s.usuario === usuario && s.token !== keep && s.token !== keepToken)
    .reverse().forEach((s) => sheet_('sesiones').deleteRow(s._row));
}

function pruneSessions_() {
  const now = new Date();
  rows_('sesiones').filter((s) => !s.token || new Date(s.expira) < now).reverse().forEach((s) => sheet_('sesiones').deleteRow(s._row));
}

function requireAdmin_(me) {
  return me.rol === 'admin' ? null : { ok: false, error: 'Solo un administrador puede hacer esto.' };
}

function upsertUser_(me, req) {
  const usuario = normalize_(req.usuario);
  let rol = ROLES.indexOf(req.rol) >= 0 ? req.rol : 'adulto';
  const nombre = safeText_(req.nombre).trim();
  if (!validUser_(usuario) || !nombre) return { ok: false, error: 'Escribe nombre y usuario (letras y números, sin espacios).' };
  // Nadie se quita a sí mismo el rol de administrador.
  if (usuario === me.usuario) rol = 'admin';
  const existing = users_().find((u) => u.usuario === usuario);
  const sh = sheet_('usuarios');
  if (existing) {
    sh.getRange(existing._row, 2, 1, 2).setValues([[nombre, rol]]);
    if (req.password) {
      if (!validPassword_(req.password)) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
      const salt = Utilities.getUuid();
      sh.getRange(existing._row, 4, 1, 2).setValues([[salt, hashOf_(salt, req.password)]]);
      dropSessionsOf_(usuario, usuario === me.usuario ? req.token : null);
    }
  } else {
    if (!validPassword_(req.password)) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    const salt = Utilities.getUuid();
    sh.appendRow([usuario, nombre, rol, salt, hashOf_(salt, req.password), new Date()]);
  }
  return { ok: true, usuarios: users_().map(publicUser_) };
}

function removeUser_(me, req) {
  const usuario = normalize_(req.usuario);
  if (usuario === me.usuario) return { ok: false, error: 'No puedes quitar tu propia cuenta.' };
  const u = users_().find((x) => x.usuario === usuario);
  if (u) sheet_('usuarios').deleteRow(u._row);
  dropSessionsOf_(usuario, null);
  return { ok: true, usuarios: users_().map(publicUser_) };
}

function changePassword_(me, req) {
  if (!passwordMatches_(me, req.actual)) return { ok: false, error: 'Tu contraseña actual no coincide.' };
  if (!validPassword_(req.nueva)) return { ok: false, error: 'La contraseña nueva debe tener al menos 6 caracteres.' };
  return locked_(() => {
    const salt = Utilities.getUuid();
    sheet_('usuarios').getRange(me._row, 4, 1, 2).setValues([[salt, hashOf_(salt, req.nueva)]]);
    dropSessionsOf_(me.usuario, req.token);
    return { ok: true };
  });
}

// ---------- Datos de la familia ----------

// Cada parte se guarda con un ~ al inicio (formato 2) para que Sheets nunca la lea como fórmula.
function readState_() {
  const v2 = String(meta_('formato') || '') === '2';
  const parts = rows_('estado').filter((r) => r.json !== '').sort((a, b) => a.parte - b.parte).map((r) => (v2 ? String(r.json).slice(1) : String(r.json))).join('');
  return parts ? JSON.parse(parts) : null;
}

function writeState_(state, updatedAt) {
  const json = JSON.stringify(state || {});
  const sh = sheet_('estado');
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  const out = [];
  for (let i = 0, k = 0; i < json.length; i += CHUNK, k++) out.push([k, '~' + json.slice(i, i + CHUNK)]);
  if (out.length) sh.getRange(2, 1, out.length, 2).setValues(out);
  meta_('formato', '2');
  meta_('updatedAt', updatedAt);
}

// La maestra no recibe los PIN ni los premios de la familia.
function forRole_(state, me) {
  if (!state || me.rol !== 'maestra') return state;
  const s = JSON.parse(JSON.stringify(state));
  if (s.prefs) { delete s.prefs.pins; delete s.prefs.pinsAt; }
  s.rewards = [];
  s.redemptions = [];
  return s;
}

function load_(me) {
  return { ok: true, state: forRole_(readState_(), me), updatedAt: Number(meta_('updatedAt') || 0) };
}

const byIdMap_ = (list) => {
  const m = {};
  (Array.isArray(list) ? list : []).forEach((x) => { if (x && typeof x.id === 'string') m[x.id] = x; });
  return m;
};
const isNewer_ = (a, b) => (Number(b && b.updatedAt) || 0) > (Number(a && a.updatedAt) || 0);
const values_ = (m) => Object.keys(m).map((k) => m[k]);

// Lo que la maestra puede cambiar: rutinas, notas y metas de la familia, y su propio perfil
// y práctica. Todo lo demás (perfiles, PIN, premios, datos de cada quien) se queda como estaba.
function teacherMerge_(stored, incoming) {
  const out = JSON.parse(JSON.stringify(stored || {}));
  const inc = incoming || {};
  const profiles = byIdMap_(out.profiles);
  (inc.profiles || []).forEach((p) => {
    if (p && p.role === 'maestra' && typeof p.id === 'string' && (!profiles[p.id] || (profiles[p.id].role === 'maestra' && isNewer_(profiles[p.id], p)))) profiles[p.id] = p;
  });
  out.profiles = values_(profiles);
  const teachers = out.profiles.filter((p) => p.role === 'maestra').map((p) => p.id);
  ['routines', 'notes'].forEach((k) => {
    const m = byIdMap_(out[k]);
    (inc[k] || []).forEach((x) => { if (x && typeof x.id === 'string' && (!m[x.id] || isNewer_(m[x.id], x))) m[x.id] = x; });
    out[k] = values_(m);
  });
  out.goals = out.goals || {};
  Object.keys(inc.goals || {}).forEach((pid) => { if (isNewer_(out.goals[pid], inc.goals[pid])) out.goals[pid] = inc.goals[pid]; });
  ['sessions', 'bolt', 'steps'].forEach((k) => {
    const m = byIdMap_(out[k]);
    (inc[k] || []).forEach((x) => { if (x && typeof x.id === 'string' && teachers.indexOf(x.profile) >= 0 && !m[x.id]) m[x.id] = x; });
    out[k] = values_(m);
  });
  const seen = {};
  (out.ledger || []).forEach((l) => { seen[[l.profile, l.at, l.reason, l.amount].join('|')] = true; });
  out.ledger = (out.ledger || []).concat((inc.ledger || []).filter((l) => l && teachers.indexOf(l.profile) >= 0 && !seen[[l.profile, l.at, l.reason, l.amount].join('|')]));
  out.badges = out.badges || {};
  teachers.forEach((t) => { if (inc.badges && inc.badges[t]) out.badges[t] = inc.badges[t]; });
  // Solo puede borrar rutinas y notas.
  const deletable = {};
  (out.routines || []).concat(out.notes || [], inc.routines || [], inc.notes || []).forEach((x) => { if (x && x.id) deletable[x.id] = true; });
  out.removed = out.removed || {};
  Object.keys(inc.removed || {}).forEach((id) => { if (deletable[id] && !profiles[id]) out.removed[id] = inc.removed[id]; });
  return out;
}

function save_(me, req) {
  return locked_(() => {
    // La versión la numera el servidor (no el reloj del teléfono). Si el teléfono no partió
    // de la última versión guardada, recibe la del servidor para juntarla y volver a enviar.
    const stored = Number(meta_('updatedAt') || 0);
    if (Number(req.base || 0) !== stored) {
      return { ok: true, conflict: true, state: forRole_(readState_(), me), updatedAt: stored };
    }
    let state = req.state || {};
    if (JSON.stringify(state).length > MAX_STATE) return { ok: false, error: 'Los datos son demasiado grandes para guardarse.' };
    if (me.rol === 'maestra') state = teacherMerge_(readState_(), state);
    const at = Math.max(stored + 1, Date.now());
    writeState_(state, at);
    // A la maestra se le regresa lo que quedó guardado, para que su teléfono no muestre cambios rechazados.
    return me.rol === 'maestra' ? { ok: true, updatedAt: at, state: forRole_(state, me) } : { ok: true, updatedAt: at };
  });
}
