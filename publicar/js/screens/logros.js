import * as store from '../store.js';
import { esc, icon, bar, dayKey, addDays, dow, DIAS_L, MESES } from '../ui.js';

const BADGE_LOOK = {
  primera: ['leaf', '#9CC5A1'],
  brote: ['leaf', '#B9DEC3'],
  semana: ['leaf', '#6FA58A'],
  madrugada: ['sun', '#E2CC94'],
  buho: ['moon', '#B9DEC3'],
  nariz: ['nose', '#9CC5A1'],
  exploradora: ['star', '#E2CC94'],
  cumplida: ['repeat', '#9CC5A1'],
  caminante: ['steps', '#B9DEC3'],
  aire20: ['timer', '#E9DFC4'],
  mes: ['flame', '#E9B27D'],
};

// Medallón redondo de una insignia: a color si está ganada, atenuado si no.
export function medallion(b, size = 64) {
  const [ic, color] = BADGE_LOOK[b.id] || ['star', '#E2CC94'];
  const on = b.earned;
  return `<span aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;
    background:${on ? '#2A4033' : '#16231C'};border:3px solid ${on ? color : 'rgba(238,243,236,0.10)'};color:${on ? color : '#5E6E63'}">${icon(ic, Math.round(size * 0.45))}</span>`;
}

// Planta que crece con cada nivel.
export function plant(index, size = 96) {
  const soil = '<ellipse cx="48" cy="84" rx="30" ry="7" fill="#2A4033"/>';
  const art = [
    '<ellipse cx="48" cy="78" rx="8" ry="5" fill="#E2CC94"/><path d="M48 74 q2 -6 6 -8" stroke="#9CC5A1" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="M48 82 V58" stroke="#6FA58A" stroke-width="4" stroke-linecap="round"/><path d="M48 64 C 36 64, 30 54, 32 46 C 42 46, 48 54, 48 64Z" fill="#9CC5A1"/><path d="M48 60 C 58 60, 66 52, 64 44 C 54 44, 48 52, 48 60Z" fill="#B9DEC3"/>',
    '<path d="M48 82 V36" stroke="#6FA58A" stroke-width="4" stroke-linecap="round"/><path d="M48 70 C 34 70, 28 60, 30 52 C 42 52, 48 60, 48 70Z" fill="#9CC5A1"/><path d="M48 62 C 62 62, 68 52, 66 44 C 54 44, 48 52, 48 62Z" fill="#B9DEC3"/><path d="M48 48 C 38 48, 34 40, 36 32 C 44 32, 48 40, 48 48Z" fill="#6FA58A"/><path d="M48 42 C 58 42, 62 34, 60 26 C 52 26, 48 34, 48 42Z" fill="#9CC5A1"/>',
    '<rect x="44" y="52" width="8" height="32" rx="3" fill="#8A6F4E"/><circle cx="48" cy="40" r="24" fill="#6FA58A"/><circle cx="36" cy="46" r="13" fill="#9CC5A1"/><circle cx="60" cy="44" r="14" fill="#9CC5A1"/><circle cx="48" cy="28" r="13" fill="#B9DEC3"/>',
    '<rect x="22" y="58" width="6" height="26" rx="2" fill="#8A6F4E"/><path d="M25 22 L40 60 H10Z" fill="#6FA58A"/><rect x="66" y="58" width="6" height="26" rx="2" fill="#8A6F4E"/><path d="M69 26 L84 60 H54Z" fill="#9CC5A1"/><rect x="45" y="50" width="7" height="34" rx="2" fill="#8A6F4E"/><path d="M48 10 L66 54 H30Z" fill="#B9DEC3"/>',
  ][Math.max(0, Math.min(4, index))];
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">${soil}${art}</svg>`;
}

const shortDate = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

export default {
  get tab() { return store.profile().kind === 'adulto' ? 'progreso' : 'logros'; },
  render(ctx) {
    const p = ctx.profile;
    const kid = p.kind !== 'adulto';
    const lv = store.level(p.id);
    const v = ctx.query.get('v') === 'porganar' ? 'porganar' : 'ganadas';
    const badges = store.badgeStatus(p.id);
    const earned = badges.filter((b) => b.earned).sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
    const locked = badges.filter((b) => !b.earned).sort((a, b) => (b.current / b.target) - (a.current / a.target));
    const shown = v === 'ganadas' ? earned : locked;

    const days = store.practicedDays(p.id);
    const today = new Date();
    const monday = addDays(today, -dow(today));
    const garden = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      const key = dayKey(d);
      const isToday = key === dayKey(today);
      const done = days.has(key);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <span style="width:100%;max-width:44px;aspect-ratio:1;border-radius:14px;display:flex;align-items:flex-end;justify-content:center;background:var(--low);border:1px solid ${isToday ? 'var(--sage)' : 'var(--line)'}">
          ${done ? plant(1, 36) : '<span style="width:18px;height:4px;border-radius:4px;background:#2A4033;margin-bottom:6px"></span>'}</span>
        <span class="muted" style="${isToday ? 'color:var(--sage);font-weight:600' : ''}">${DIAS_L[i]}</span></div>`;
    }).join('');

    const ladder = store.LEVELS.map((l, i) => `<div style="flex:1;text-align:center">
      <span style="display:block;height:6px;border-radius:6px;background:${i <= lv.index ? 'var(--sage)' : 'rgba(238,243,236,0.08)'}"></span>
      <span class="muted" style="display:block;margin-top:6px;${i === lv.index ? 'color:var(--text);font-weight:600' : ''}">${esc(l.name)}</span>
      <span class="muted" style="font-size:11px">${l.min}</span></div>`).join('');

    const grid = shown.length ? `<div class="grid3" style="margin-top:14px">${shown.map((b) => `<div class="tile" style="text-align:center;padding:14px 8px">
        ${medallion(b, 58)}
        <p style="margin:8px 0 0;font-size:13px;font-weight:600;line-height:1.3">${esc(b.name)}</p>
        ${b.earned ? `<p class="muted" style="margin:4px 0 0">${shortDate(b.earnedAt)}</p>`
    : `<p class="muted" style="margin:4px 0 6px">${b.current} de ${b.target}</p>${bar((b.current / b.target) * 100, 'var(--arena)')}`}
      </div>`).join('')}</div>`
      : `<div class="tile" style="margin-top:14px;text-align:center"><p class="sub">${v === 'ganadas' ? 'Tu primera insignia llega con tu primera sesión.' : '¡Ganaste todas las insignias!'}</p>
        ${v === 'ganadas' ? '<a class="btn primary" href="#/inicio" style="margin-top:12px">Empezar a respirar</a>' : ''}</div>`;

    return `<div class="top">${kid ? '' : `<a class="icon-btn" href="#/progreso" aria-label="Volver">${icon('back', 20)}</a>`}<h1 class="h1">Tus logros, ${esc(p.name)}</h1></div>
      <div class="card" style="text-align:center">
        <div style="display:flex;justify-content:center">${plant(lv.index, 110)}</div>
        <p class="h2" style="margin-top:6px">Nivel ${esc(lv.name)}</p>
        <p class="row" style="justify-content:center;gap:6px;margin:4px 0 0;color:var(--hoja);font-weight:600">${icon('leaf', 18)} ${lv.points} ${lv.points === 1 ? "hoja" : "hojas"}</p>
        <div style="margin-top:14px">${bar(lv.pct)}</div>
        <p class="muted" style="margin:8px 0 0">${lv.next ? `Te faltan ${lv.toNext} ${lv.toNext === 1 ? "hoja" : "hojas"} para ${esc(lv.next.name)}` : '¡Llegaste al nivel más alto!'}</p>
        <div class="row" style="gap:6px;margin-top:16px;align-items:flex-start">${ladder}</div>
      </div>
      <p class="label">Tu jardín de la semana</p>
      <div class="row" style="gap:6px">${garden}</div>
      <div class="seg" role="group" aria-label="Insignias" style="margin-top:22px">
        <a href="#/logros?v=ganadas" aria-pressed="${v === 'ganadas'}">Ganadas · ${earned.length}</a>
        <a href="#/logros?v=porganar" aria-pressed="${v === 'porganar'}">Por ganar · ${locked.length}</a>
      </div>
      ${grid}
      <p class="muted" style="margin-top:18px;text-align:center">1 hoja por minuto · +5 si cumples tu rutina · +10 por insignia</p>
      <div class="tile row" style="margin-top:14px">${icon('gift', 20, 'style="color:var(--arena);flex:none"')}<span class="sub" style="margin:0">Pronto: premios de la familia para cambiar tus hojas.</span></div>`;
  },
};
