/**
 * Calmo · servidor de la familia (Google Apps Script).
 *
 * Guarda los datos de la familia en la hoja "Calmo · datos" de quien lo
 * instala y controla el ingreso con usuario y contraseña. Las contraseñas se
 * guardan como huella SHA-256 con sal, nunca en texto.
 *
 * Instalación: ver backend/LEEME.md.
 */

const BOOK_NAME = 'Calmo · datos';
const SESSION_DAYS = 180;
const CHUNK = 45000; // una celda admite ~50 000 caracteres
const ROLES = ['admin', 'adulto', 'maestra'];

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
    case 'cargar': return load_();
    case 'guardar': return save_(req);
    case 'salir': dropSession_(req.token); return { ok: true };
    case 'cambiarClave': return changePassword_(me, req);
    case 'usuarios': return requireAdmin_(me) || { ok: true, usuarios: users_().map(publicUser_) };
    case 'guardarUsuario': return requireAdmin_(me) || upsertUser_(req);
    case 'quitarUsuario': return requireAdmin_(me) || removeUser_(me, req);
  }
  return { ok: false, error: 'Acción desconocida.' };
}

// ---------- Hoja ----------

function book_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('BOOK_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* se borró: se crea otra */ }
  }
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

function validPassword_(p) {
  return typeof p === 'string' && p.length >= 6;
}

function createAdmin_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (users_().length) return { ok: false, error: 'Ya existe una cuenta de administrador.' };
    const usuario = normalize_(req.usuario);
    if (!usuario || !req.nombre) return { ok: false, error: 'Escribe tu nombre y un usuario.' };
    if (!validPassword_(req.password)) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    const salt = Utilities.getUuid();
    sheet_('usuarios').appendRow([usuario, String(req.nombre).trim(), 'admin', salt, digest_(salt, req.password), new Date()]);
    return { ok: true, token: newSession_(usuario), usuario: { usuario, nombre: String(req.nombre).trim(), rol: 'admin' } };
  } finally {
    lock.releaseLock();
  }
}

function login_(req) {
  const usuario = normalize_(req.usuario);
  const cache = CacheService.getScriptCache();
  const key = 'fallas:' + usuario;
  const fails = Number(cache.get(key) || 0);
  if (fails >= 5) return { ok: false, error: 'Demasiados intentos. Espera 10 minutos y vuelve a intentar.' };
  const u = users_().find((x) => x.usuario === usuario);
  if (!u || digest_(u.sal, String(req.password || '')) !== u.huella) {
    cache.put(key, String(fails + 1), 600);
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }
  cache.remove(key);
  return { ok: true, token: newSession_(usuario), usuario: publicUser_(u) };
}

function newSession_(usuario) {
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const expira = new Date(Date.now() + SESSION_DAYS * 864e5);
  sheet_('sesiones').appendRow([token, usuario, expira]);
  return token;
}

function session_(token) {
  if (!token) return null;
  const s = rows_('sesiones').find((r) => r.token === token);
  if (!s || new Date(s.expira) < new Date()) return null;
  return users_().find((u) => u.usuario === s.usuario) || null;
}

function dropSession_(token) {
  const s = rows_('sesiones').find((r) => r.token === token);
  if (s) sheet_('sesiones').deleteRow(s._row);
}

function requireAdmin_(me) {
  return me.rol === 'admin' ? null : { ok: false, error: 'Solo un administrador puede hacer esto.' };
}

function upsertUser_(req) {
  const usuario = normalize_(req.usuario);
  const rol = ROLES.indexOf(req.rol) >= 0 ? req.rol : 'adulto';
  if (!usuario || !req.nombre) return { ok: false, error: 'Escribe nombre y usuario.' };
  const existing = users_().find((u) => u.usuario === usuario);
  const sh = sheet_('usuarios');
  if (existing) {
    sh.getRange(existing._row, 2, 1, 2).setValues([[String(req.nombre).trim(), rol]]);
    if (req.password) {
      if (!validPassword_(req.password)) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
      const salt = Utilities.getUuid();
      sh.getRange(existing._row, 4, 1, 2).setValues([[salt, digest_(salt, req.password)]]);
    }
  } else {
    if (!validPassword_(req.password)) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    const salt = Utilities.getUuid();
    sh.appendRow([usuario, String(req.nombre).trim(), rol, salt, digest_(salt, req.password), new Date()]);
  }
  return { ok: true, usuarios: users_().map(publicUser_) };
}

function removeUser_(me, req) {
  const usuario = normalize_(req.usuario);
  if (usuario === me.usuario) return { ok: false, error: 'No puedes quitar tu propia cuenta.' };
  const u = users_().find((x) => x.usuario === usuario);
  if (u) sheet_('usuarios').deleteRow(u._row);
  rows_('sesiones').filter((s) => s.usuario === usuario).reverse().forEach((s) => sheet_('sesiones').deleteRow(s._row));
  return { ok: true, usuarios: users_().map(publicUser_) };
}

function changePassword_(me, req) {
  if (digest_(me.sal, String(req.actual || '')) !== me.huella) return { ok: false, error: 'Tu contraseña actual no coincide.' };
  if (!validPassword_(req.nueva)) return { ok: false, error: 'La contraseña nueva debe tener al menos 6 caracteres.' };
  const salt = Utilities.getUuid();
  sheet_('usuarios').getRange(me._row, 4, 1, 2).setValues([[salt, digest_(salt, req.nueva)]]);
  return { ok: true };
}

// ---------- Datos de la familia ----------

function load_() {
  const parts = rows_('estado').sort((a, b) => a.parte - b.parte).map((r) => r.json).join('');
  return { ok: true, state: parts ? JSON.parse(parts) : null, updatedAt: Number(meta_('updatedAt') || 0) };
}

function save_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const stored = Number(meta_('updatedAt') || 0);
    const incoming = Number(req.updatedAt || 0);
    if (stored > incoming && !req.base) {
      const current = load_();
      return { ok: true, conflict: true, state: current.state, updatedAt: stored };
    }
    if (req.base !== undefined && Number(req.base) < stored) {
      const current = load_();
      return { ok: true, conflict: true, state: current.state, updatedAt: stored };
    }
    const json = JSON.stringify(req.state || {});
    const sh = sheet_('estado');
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
    const out = [];
    for (let i = 0, k = 0; i < json.length; i += CHUNK, k++) out.push([k, json.slice(i, i + CHUNK)]);
    if (out.length) sh.getRange(2, 1, out.length, 2).setValues(out);
    meta_('updatedAt', incoming || Date.now());
    return { ok: true, updatedAt: incoming || Date.now() };
  } finally {
    lock.releaseLock();
  }
}
