// Tablero de la maestra: cada alumno con su constancia de los últimos 7 días,
// sus minutos contra su meta, su último BOLT, sus mensajes nuevos y las notas que no ha leído.

import { esc, icon, bar, avatar, dayKey, addDays } from '../ui.js';
import { kindLabel } from './perfil.js';

const LIGHTS = {
  verde: ['var(--sage)', 'Constante'],
  ambar: ['var(--arena)', 'A medias'],
  rojo: ['var(--brasa)', 'Poca práctica'],
};

// Días con práctica en los últimos 7: verde con 5 o más, ámbar de 2 a 4, rojo con 1 o menos.
export function constancy(store, id) {
  const days = store.practicedDays(id);
  const n = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), -i))).filter((k) => days.has(k)).length;
  return { n, light: n >= 5 ? 'verde' : n >= 2 ? 'ambar' : 'rojo' };
}

export const lightDot = (light, size = 12) => `<span aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:50%;flex:none;background:${LIGHTS[light][0]}"></span>`;

export default {
  tab: 'alumnos',
  render(ctx) {
    const { store } = ctx;
    const people = store.familyMembers();
    const top = `<div class="top"><h1 class="h1">Alumnos</h1>
      <a class="icon-btn" href="#/asignar" aria-label="Asignar una práctica" style="background:var(--sage);color:var(--on-sage)">${icon('plus', 20)}</a></div>`;
    if (!people.length) {
      return `${top}<div class="tile"><p class="sub" style="margin:0">La familia todavía no tiene perfiles. Cuando los den de alta, aparecerán aquí.</p></div>`;
    }
    const rows = people.map((p) => {
      const c = constancy(store, p.id);
      const [color, label] = LIGHTS[c.light];
      const mins = Math.floor(store.last7(p.id));
      const goal = store.goals(p.id).weekly || 1;
      const bolts = store.bolt(p.id);
      const lb = bolts.at(-1);
      const prev = bolts.at(-2);
      const trend = lb && prev ? (lb.seconds > prev.seconds ? ' ↑' : lb.seconds < prev.seconds ? ' ↓' : ' =') : '';
      const unread = store.unreadNotes(p.id).length;
      const replies = store.unreadReplies(p.id).length;
      return `<a class="card" href="#/alumno/${esc(p.id)}" style="display:block;color:inherit;text-decoration:none;padding:14px 16px">
        <div class="row" style="gap:12px">${avatar(p, 44)}
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(p.name)}</span><span class="muted">${esc(kindLabel(p))}</span></span>
          <span class="row" style="gap:6px;font-size:13px;color:${color}">${lightDot(c.light)}${c.n} de 7 días<span class="sr-only"> · ${esc(label)}</span></span>
        </div>
        <div style="margin-top:12px">${bar((mins / goal) * 100)}</div>
        <div class="between muted" style="margin-top:6px;font-size:13px;gap:4px 10px;flex-wrap:wrap">
          <span>${mins} de ${goal} min en 7 días</span>
          <span>${p.kind === 'adulto' ? 'BOLT' : 'Reto del aire'} ${lb ? `${lb.seconds} s${trend}` : '—'}${p.kind === 'peque' ? '' : ` · pasos ${store.bestSteps(p.id) || '—'}`}</span>
        </div>
        ${replies ? `<p class="row" style="gap:6px;margin:10px 0 0;font-size:14px;font-weight:600;color:var(--hoja)">${icon('msg', 15)} ${replies === 1 ? '1 mensaje nuevo' : `${replies} mensajes nuevos`}</p>` : ''}
        ${unread ? `<p class="muted" style="margin:6px 0 0;font-size:12px">${unread === 1 ? '1 nota tuya sin leer' : `${unread} notas tuyas sin leer`}</p>` : ''}
      </a>`;
    }).join('');
    return `${top}
      <p class="sub" style="margin-top:0">Constancia de los últimos 7 días. Toca a alguien para ver su detalle.</p>
      <div class="row muted" style="gap:6px 14px;font-size:12px;margin:10px 0 14px;flex-wrap:wrap">
        ${Object.entries(LIGHTS).map(([k, [, label]]) => `<span class="row" style="gap:5px">${lightDot(k, 10)}${label}</span>`).join('')}
      </div>
      <div class="stack">${rows}</div>`;
  },
};
