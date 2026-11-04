// Utilidades de interfaz: escape de texto, íconos y formatos.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  cloud: '<path d="M7 16a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 7a4 4 0 0 1 1 8"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
  wave: '<path d="M3 9c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 15c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 10l4 4M21 10l-4 4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.3.6 3.5 2.8 3.5 6"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  msg: '<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 13 11"/>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>',
  nose: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  star: '<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z"/>',
  // Engrane de seis dientes: no confundir con «sun», que lleva rayos sueltos.
  gear: '<path d="M10.3 5.6L10.4 2.5A9.6 9.6 0 0 1 13.6 2.5L13.7 5.6A6.6 6.6 0 0 1 16.7 7.3L19.4 5.9A9.6 9.6 0 0 1 21 8.7L18.4 10.3A6.6 6.6 0 0 1 18.4 13.7L21 15.3A9.6 9.6 0 0 1 19.4 18.1L16.7 16.7A6.6 6.6 0 0 1 13.7 18.4L13.6 21.5A9.6 9.6 0 0 1 10.4 21.5L10.3 18.4A6.6 6.6 0 0 1 7.3 16.7L4.6 18.1A9.6 9.6 0 0 1 3 15.3L5.6 13.7A6.6 6.6 0 0 1 5.6 10.3L3 8.7A9.6 9.6 0 0 1 4.6 5.9L7.3 7.3A6.6 6.6 0 0 1 10.3 5.6Z"/><circle cx="12" cy="12" r="2.6"/>',
  edit: '<path d="M4 20v-4L15 5a2.8 2.8 0 0 1 4 4L8 20z"/><path d="M13.5 6.5l4 4"/>',
  repeat: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  steps: '<path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM16 9c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 16h4M14 21h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
};

export function icon(name, size = 22, extra = '') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

export function minutesLabel(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// Fechas locales en formato YYYY-MM-DD.
export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Lunes = 0 … domingo = 6.
export const dow = (d) => (d.getDay() + 6) % 7;

export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const DIAS_C = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function longDate(d = new Date()) {
  const s = `${DIAS[dow(d)]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hhmm(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function moment(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'manana';
  if (h >= 12 && h < 19) return 'tarde';
  return 'noche';
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function confetti(colors = ['#9CC5A1', '#B9DEC3', '#E2CC94', '#E9B27D']) {
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 26; i++) {
    const leaf = document.createElement('i');
    leaf.style.left = `${Math.random() * 100}%`;
    leaf.style.background = colors[i % colors.length];
    leaf.style.animationDuration = `${3 + Math.random() * 3}s`;
    leaf.style.animationDelay = `${Math.random() * 1.2}s`;
    box.appendChild(leaf);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 7000);
}

export function bar(pct, color = 'var(--sage)', label = 'Avance') {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="bar" role="img" aria-label="${esc(label)}: ${p} %"><i style="width:${p}%;background:${color}"></i></div>`;
}

export function avatar(profile, size = 44) {
  const tint = { adulto: ['#2A4033', '#B9DEC3'], junior: ['rgba(226,204,148,0.18)', '#E2CC94'], peque: ['rgba(233,178,125,0.22)', '#E9B27D'] }[profile.kind];
  return `<span class="avatar" aria-hidden="true" style="width:${size}px;height:${size}px;background:${tint[0]};color:${tint[1]};font-size:${Math.round(size * 0.42)}px">${esc(profile.name.charAt(0))}</span>`;
}

// "1 hoja", "3 hojas".
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Confirmación dentro de la página: en claude.ai los diálogos del navegador no aparecen.
// Mientras hay un diálogo, el resto de la app no recibe foco ni toques.
const setInert = (on) => { const app = document.getElementById('app'); if (app) app.inert = on; };

// outside: qué responde un toque fuera del cuadro o Escape (por omisión, lo mismo que «cancelar»).
// focus: qué botón recibe el foco al abrir; por omisión el de cancelar, que es el seguro.
export function askConfirm(message, { ok = 'Sí, continuar', cancel = 'Cancelar', outside = false, focus = 'cancel' } = {}) {
  return new Promise((resolve) => {
    const before = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'ask';
    wrap.innerHTML = `<div class="ask-box" role="alertdialog" aria-modal="true" aria-label="${esc(message)}">
      <p style="margin:0;font-size:16px;line-height:1.5">${esc(message)}</p>
      <div class="row" style="margin-top:18px;justify-content:flex-end">
        <button class="btn small" data-a="no">${esc(cancel)}</button>
        <button class="btn small primary" data-a="si">${esc(ok)}</button>
      </div></div>`;
    const buttons = () => [...wrap.querySelectorAll('[data-a]')];
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); done(outside); }
      else if (e.key === 'Tab') {
        // El foco se queda dentro del diálogo.
        const [first, last] = [buttons()[0], buttons().at(-1)];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const done = (v) => {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      setInert(false);
      if (before && typeof before.focus === 'function' && document.contains(before)) before.focus({ preventScroll: true });
      resolve(v);
    };
    wrap.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a) done(a === 'si');
      else if (e.target === wrap) done(outside);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(wrap);
    setInert(true);
    wrap.querySelector(focus === 'ok' ? '[data-a="si"]' : '[data-a="no"]').focus();
  });
}

// Clave para comparar nombres sin importar mayúsculas, acentos ni espacios de más
// («Sofía» = «sofia»). La ñ se respeta: «Peña» y «Pena» son nombres distintos.
export const nameKey = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
  .normalize('NFD').replace(/n\u0303/g, '\u00f1').replace(/[\u0300-\u036f]/g, '');

// Teclado de PIN en un diálogo dentro de la página. Regresa una Promise con el PIN
// escrito (texto de 4 números) o null si se cancela.
// - check(pin) => true/false: pide un PIN existente hasta que coincida.
// - create: true: pide un PIN nuevo dos veces y regresa el nuevo.
// Con los dos, primero pide el actual y luego el nuevo (para cambiarlo).
let pinSeq = 0;
export function askPin({ title, sub = '', check = null, create = false, prompt = 'Escribe tu PIN', cancel = 'Cancelar' } = {}) {
  return new Promise((resolve) => {
    const steps = [];
    if (check) steps.push({ kind: 'check', text: prompt });
    if (create) steps.push({ kind: 'new', text: 'Escribe un PIN de 4 números' }, { kind: 'repeat', text: 'Escríbelo otra vez para confirmar' });
    if (!steps.length) { resolve(null); return; }
    let at = 0;
    let digits = '';
    let first = '';
    let busy = false;
    const id = `pin-t${++pinSeq}`;
    const before = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'ask';
    wrap.innerHTML = `<div class="ask-box pin-box" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <p class="h3" id="${id}" style="text-align:center;margin:0;font-size:17px;line-height:1.4">${esc(title)}</p>
      ${sub ? `<p class="sub" style="text-align:center;margin-top:6px">${esc(sub)}</p>` : ''}
      <p class="pin-step" aria-live="polite"></p>
      <div class="pin-dots" role="img">${'<span></span>'.repeat(4)}</div>
      <p class="pin-err" role="alert"></p>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('')}<span aria-hidden="true"></span><button type="button" data-k="0">0</button><button type="button" data-k="del" aria-label="Borrar">⌫</button></div>
      <button type="button" class="btn small block" data-a="no" style="margin-top:12px">${esc(cancel)}</button>
    </div>`;
    const stepEl = wrap.querySelector('.pin-step');
    const dotsEl = wrap.querySelector('.pin-dots');
    const errEl = wrap.querySelector('.pin-err');

    const draw = () => {
      const n = steps.filter((s) => s.kind !== 'repeat').length;
      const pos = steps.slice(0, at + 1).filter((s) => s.kind !== 'repeat').length;
      stepEl.textContent = (n > 1 && steps[at].kind !== 'repeat' ? `${pos} de ${n} · ` : '') + steps[at].text;
      dotsEl.setAttribute('aria-label', `${digits.length} de 4 números`);
      dotsEl.querySelectorAll('span').forEach((d, i) => d.classList.toggle('on', i < digits.length));
    };
    const fail = (msg) => {
      errEl.textContent = msg;
      dotsEl.classList.remove('bad');
      void dotsEl.offsetWidth; // reinicia la animación
      dotsEl.classList.add('bad');
    };
    const close = (v) => {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      setInert(false);
      if (before && typeof before.focus === 'function' && document.contains(before)) before.focus({ preventScroll: true });
      resolve(v);
    };
    const complete = () => {
      busy = false;
      const step = steps[at];
      const pin = digits;
      digits = '';
      if (step.kind === 'check' && !check(pin)) { fail('Ese PIN no coincide. Intenta otra vez.'); draw(); return; }
      if (step.kind === 'new') first = pin;
      if (step.kind === 'repeat' && pin !== first) {
        first = '';
        at = steps.findIndex((s) => s.kind === 'new');
        fail('No coincidió. Escríbelo de nuevo.');
        draw();
        return;
      }
      errEl.textContent = '';
      if (at === steps.length - 1) { close(create ? first : pin); return; }
      at += 1;
      draw();
    };
    const press = (k) => {
      if (busy) return;
      if (k === 'del') digits = digits.slice(0, -1);
      else if (digits.length < 4) digits += k;
      errEl.textContent = '';
      draw();
      // Un respiro para que se vea el cuarto punto antes de revisar.
      if (digits.length === 4) { busy = true; setTimeout(complete, 140); }
    };
    // También con teclado físico: números, borrar y Escape para cancelar.
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
    };
    wrap.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (k) { press(k); return; }
      if (e.target.closest('[data-a="no"]') || e.target === wrap) close(null);
    });
    document.addEventListener('keydown', onKey, true);
    draw();
    document.body.appendChild(wrap);
    setInert(true);
    wrap.querySelector('[data-k="1"]').focus({ preventScroll: true });
  });
}
