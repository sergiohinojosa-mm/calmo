// Resumen de la semana para la maestra: cada alumno con lo esencial de los últimos 7 días
// contra los 7 anteriores, y arriba quién pide su atención.

import { esc, icon, avatar, dayKey, addDays } from '../ui.js';
import { byId, nameFor } from '../catalog.js';
import { kindLabel } from './perfil.js';
import { constancy, lightDot } from './alumnos.js';

const FEEL = { tranquilo: 'en calma', bien: 'bien', costo: 'le costó' };

// Lo de 7 días que terminan `back` semanas atrás (0 = los últimos 7 días, hoy incluido).
function weekOf(store, id, back) {
  const to = addDays(new Date(), -7 * back);
  const a = dayKey(addDays(to, -6));
  const b = dayKey(to);
  const inside = (x) => x.day >= a && x.day <= b;
  const bolts = store.bolt(id).filter(inside);
  // El BOLT de la mañana es el comparable; si no midió en la mañana, se usa el que haya.
  const morning = bolts.filter((m) => m.morning);
  const use = morning.length ? morning : bolts;
  const bolt = use.length ? Math.round(use.reduce((sum, m) => sum + m.seconds, 0) / use.length) : null;
  let planned = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    store.agenda(id, addDays(to, -i)).filter((it) => it.type === 'plan').forEach((it) => {
      planned += 1;
      if (it.status === 'hecha') done += 1;
    });
  }
  const sessions = store.sessions(id).filter(inside);
  const feels = {};
  sessions.forEach((s) => { if (s.feel) feels[s.feel] = (feels[s.feel] || 0) + 1; });
  return {
    bolt, morning: morning.length > 0, planned, done, feels,
    minutes: Math.floor(sessions.reduce((sum, s) => sum + s.durationSec / 60, 0)),
    steps: store.steps(id).filter(inside).reduce((best, m) => Math.max(best, m.steps), 0),
  };
}

// Lo que pide atención, en el orden en que conviene verlo.
function flags(store, p, now, before) {
  const out = [];
  const replies = store.unreadReplies(p.id).length;
  if (replies) out.push(replies === 1 ? 'Te escribió' : `Te escribió ${replies} veces`);
  if (constancy(store, p.id).light === 'rojo') out.push('Poca práctica');
  if (now.bolt !== null && before.bolt !== null && now.bolt <= before.bolt - 2) out.push('Su BOLT bajó');
  if ((now.feels.costo || 0) >= 2) out.push(`Le costó ${now.feels.costo} sesiones`);
  return out;
}

const cell = (label, value, sub = '') => `<div class="tile" style="padding:10px 12px">
  <p class="muted" style="margin:0;font-size:12px">${label}</p>
  <p style="margin:2px 0 0;font-size:17px;font-weight:600">${value}</p>${sub ? `<p class="muted" style="margin:1px 0 0;font-size:12px">${sub}</p>` : ''}</div>`;

export default {
  tab: 'alumnos',
  render(ctx) {
    const { store } = ctx;
    const people = store.familyMembers();
    const top = `<div class="top"><a class="icon-btn" href="#/alumnos" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Resumen de la semana</h1></div>`;
    if (!people.length) return `${top}<p class="sub">Todavía no hay alumnos.</p>`;
    const rows = people.map((p) => {
      const now = weekOf(store, p.id, 0);
      const before = weekOf(store, p.id, 1);
      return { p, now, before, flags: flags(store, p, now, before) };
    });
    const attention = rows.filter((r) => r.flags.length);
    const cards = rows.map(({ p, now, before, flags: f }) => {
      const c = constancy(store, p.id);
      const goal = store.goals(p.id).weekly || 1;
      const boltWord = p.kind === 'adulto' ? 'BOLT' : 'Reto del aire';
      const delta = now.bolt !== null && before.bolt !== null ? now.bolt - before.bolt : null;
      const deltaText = delta === null ? 'Sin semana anterior para comparar' : delta === 0 ? 'Igual que la semana pasada' : `${delta > 0 ? '+' : ''}${delta} s vs. la semana pasada`;
      const feels = Object.entries(now.feels).map(([k, n]) => `${n} ${FEEL[k]}`).join(' · ');
      const prog = store.currentProgram(p.id);
      const progEx = prog && byId(prog.exerciseId);
      return `<a class="card" href="#/alumno/${esc(p.id)}" style="display:block;color:inherit;text-decoration:none;padding:14px 16px">
        <div class="row" style="gap:12px">${avatar(p, 44)}
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(p.name)}</span><span class="muted">${esc(kindLabel(p))}</span></span>
          <span class="row" style="gap:6px;font-size:13px">${lightDot(c.light)}${c.n} de 7 días</span>
        </div>
        ${f.length ? `<div class="pills" style="margin-top:10px">${f.map((x) => `<span class="chip brasa">${esc(x)}</span>`).join('')}</div>` : ''}
        <div class="grid2" style="margin-top:12px;gap:8px">
          ${cell(`${boltWord}${now.morning ? ' de la mañana' : ''}`, now.bolt === null ? 'Sin medir' : `${now.bolt} s`, now.bolt === null ? '' : deltaText)}
          ${cell('Prácticas', now.planned ? `${now.done} de ${now.planned}` : 'Sin rutinas', now.planned ? 'hechas en su horario' : '')}
          ${cell('Minutos', `${now.minutes} de ${goal}`, `${before.minutes} la semana pasada`)}
          ${p.kind === 'peque' ? '' : cell('Serie caminando', now.steps ? `${now.steps} pasos` : '—', now.steps ? 'su mejor retención' : '')}
        </div>
        ${feels ? `<p class="muted" style="margin:10px 0 0">Cómo se sintió: ${esc(feels)}</p>` : ''}
        ${prog ? `<p class="row" style="gap:6px;margin:8px 0 0;font-size:13px;color:var(--hoja)">${icon('leaf', 14)} Semana ${prog.week} de ${prog.weeks}: ${esc(progEx ? nameFor(progEx, 'adulto') : 'Práctica')}</p>` : ''}
      </a>`;
    }).join('');
    return `${top}
      <p class="sub" style="margin-top:0">Los últimos 7 días comparados con los 7 anteriores. Toca a alguien para ver su detalle.</p>
      ${attention.length ? `<div class="tile" style="margin-top:12px;border:1px solid rgba(233,178,125,0.35)">
        <p style="margin:0;font-weight:600">Para atender</p>
        <p class="muted" style="margin:4px 0 0">${attention.map((r) => `${esc(r.p.name)}: ${esc(r.flags.join(', ').toLowerCase())}`).join(' · ')}</p>
      </div>` : `<div class="tile" style="margin-top:12px"><p class="muted" style="margin:0">Nadie pide atención esta semana.</p></div>`}
      <div class="stack" style="margin-top:14px">${cards}</div>`;
  },
};
