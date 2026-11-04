import { esc, icon, bar, dayKey, addDays, dow, DIAS_L, DIAS_C, MESES, minutesLabel, pad2 } from '../ui.js';
import { byId, nameFor, GOALS, boltPlan } from '../catalog.js';
import { medallion } from './logros.js';
import { boltLevel } from './perfil.js';
import { shortDay, boltPoints, stepPoints, trendChart, mountTrends } from '../trend.js';

const MES_C = (i) => MESES[i].slice(0, 3);

// Rango de fechas y barras del periodo elegido.
function period(p, o) {
  const today = new Date();
  if (p === 'dia') {
    const d = addDays(today, o);
    const label = o === 0 ? 'Hoy' : o === -1 ? 'Ayer' : `${DIAS_C[dow(d)]} ${d.getDate()} ${MES_C(d.getMonth())}`;
    return { from: d, to: d, label, buckets: [['Mañana', (s) => hour(s) >= 5 && hour(s) < 12], ['Tarde', (s) => hour(s) >= 12 && hour(s) < 19], ['Noche', (s) => hour(s) >= 19 || hour(s) < 5]] };
  }
  if (p === 'mes') {
    const first = new Date(today.getFullYear(), today.getMonth() + o, 1);
    const last = new Date(today.getFullYear(), today.getMonth() + o + 1, 0);
    const buckets = [];
    let start = new Date(first);
    let n = 1;
    while (start <= last) {
      const end = addDays(start, 6 - dow(start));
      const a = dayKey(start), b = dayKey(end < last ? end : last);
      buckets.push([`Sem ${n}`, (s) => s.day >= a && s.day <= b]);
      start = addDays(end, 1);
      n += 1;
    }
    const label = `${MESES[first.getMonth()].charAt(0).toUpperCase()}${MESES[first.getMonth()].slice(1)} ${first.getFullYear()}`;
    return { from: first, to: last, label, buckets };
  }
  const to = addDays(today, o * 7);
  const from = addDays(to, -6);
  const label = o === 0 ? 'Últimos 7 días' : `${from.getDate()} ${MES_C(from.getMonth())} – ${to.getDate()} ${MES_C(to.getMonth())}`;
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    const key = dayKey(d);
    return [key === dayKey(today) ? 'Hoy' : DIAS_L[dow(d)], (s) => s.day === key];
  });
  return { from, to, label, buckets };
}

const hour = (s) => new Date(s.startedAt).getHours();

// Minutos siempre hacia abajo, igual en totales, barras e historial.
const minText = (m) => (m > 0 && m < 1 ? '&lt;1 min' : minutesLabel(Math.floor(m)));

// BOLT y pasos de un adulto en el periodo: la última marca, su línea y el botón para medir.
function measureCards(store, prof, per, p) {
  const g = store.goals(prof.id);
  const a = dayKey(per.from), b = dayKey(per.to);
  const inPeriod = (list) => list.filter((m) => m.day >= a && m.day <= b).sort((x, y) => x.takenAt.localeCompare(y.takenAt));
  const when = (iso) => { const d = new Date(iso); return p === 'dia' ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : shortDay(d); };
  const list = (items, fmt) => (items.length ? `<p class="muted" style="margin:10px 0 0">${items.slice(-5).reverse().map(fmt).join(' · ')}</p>` : '');
  const empty = (txt) => `<p class="muted" style="margin:14px 0 0">${txt}</p>`;
  const summary = (vals, unit) => (vals.length > 1 ? `<p class="muted" style="margin:10px 0 0">Promedio ${Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)}${unit} · mejor ${Math.max(...vals)}${unit}</p>` : '');

  const lb = store.lastBolt(prof.id);
  const bolts = inPeriod(store.bolt(prof.id));
  const boltCard = `<div class="card">
    <div class="between" style="align-items:flex-start">
      <div><p class="muted" style="margin:0;font-size:13px;color:var(--text2)">BOLT score</p>
        <p class="num" style="margin:2px 0 0;font-size:44px;line-height:1.05">${lb ? lb.seconds : '—'} <span style="font-family:var(--sans);font-size:15px;color:var(--text2)">s</span></p></div>
      ${lb ? `<span class="chip sage">Nivel ${boltLevel(lb.seconds).toLowerCase()}</span>` : ''}
    </div>
    <p class="muted" style="margin:4px 0 0">${lb ? `Tu última medición · meta ${g.bolt} s · ${lb.seconds >= g.bolt ? '¡meta lograda!' : `te faltan ${g.bolt - lb.seconds} s`}` : `Meta ${g.bolt} s · mídelo al despertar`}</p>
    ${bolts.length ? trendChart(boltPoints(bolts), { per, p, goal: g.bolt, color: 'var(--sage)', what: 'BOLT', unit: ' s' }) : empty('Sin mediciones en este periodo.')}
    ${summary(bolts.map((m) => m.seconds), ' s')}
    ${list(bolts, (m) => `${when(m.takenAt)}: ${m.seconds} s`)}
    <a class="btn primary block" href="#/bolt" style="margin-top:16px">${icon('timer', 18)} Medir BOLT</a>
  </div>`;

  const best = store.bestSteps(prof.id);
  const steps = inPeriod(store.steps(prof.id));
  const stepsCard = `<div class="card">
    <p class="muted" style="margin:0;font-size:13px;color:var(--text2)">Pasos sin respirar</p>
    <div class="row" style="align-items:baseline;gap:10px"><p class="num" style="margin:2px 0 0;font-size:44px;line-height:1.05">${best || '—'}</p><span class="muted">${best ? 'tu mejor marca' : 'sin medir todavía'}</span></div>
    <p class="muted" style="margin:4px 0 0">Meta ${g.steps} pasos${best ? ` · ${best >= g.steps ? '¡meta lograda!' : `te faltan ${g.steps - best}`}` : ''}</p>
    ${steps.length ? trendChart(stepPoints(steps), { per, p, goal: g.steps, color: 'var(--hoja)', what: 'Pasos', unit: ' pasos' }) : empty('Sin series en este periodo.')}
    ${list(steps, (m) => `${when(m.takenAt)}: ${(m.series && m.series.length ? m.series : [m.steps]).join(' · ')} pasos`)}
    <a class="btn primary block" href="#/serie" style="margin-top:16px">${icon('steps', 18)} Serie caminando</a>
  </div>`;
  return `<div class="stack" style="margin-top:12px">${boltCard}${planCard(store, prof)}${stepsCard}</div>`;
}

// «Tu plan»: qué practicar según el BOLT de la mañana. Si la maestra asignó un programa,
// se ve primero, porque lo que ella pide manda.
function planCard(store, prof) {
  const b = store.planBolt(prof.id);
  const prog = store.currentProgram(prof.id);
  const teacher = store.teacher();
  const progEx = prog && byId(prog.exerciseId);
  const starts = prog && prog.since > dayKey() ? ` · empieza el ${shortDay(new Date(`${prog.since}T00:00`))}` : '';
  const progHtml = prog ? `<a class="tile row" href="#/calendario" style="margin-top:12px;color:inherit;text-decoration:none;border:1px solid rgba(185,222,195,0.3)">
      ${icon('leaf', 20, 'style="color:var(--hoja);flex:none"')}
      <span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:14px">${esc(store.teacherName(prog.by))} te asignó un programa</span>
        <span class="muted">Semana ${prog.week} de ${prog.weeks}: ${esc(progEx ? nameFor(progEx, 'adulto') : 'Práctica')} · ${prog.minutes} min${starts}</span></span>
      ${icon('chev', 18, 'style="color:var(--muted)"')}</a>` : '';
  if (!b) {
    return `<div class="card" id="plan"><span class="chip sage">${icon('leaf', 14)} Tu plan</span>
      <p class="sub" style="margin-top:10px">Mide tu BOLT al despertar y aquí verás qué practicar para subirlo.</p>${progHtml}</div>`;
  }
  const plan = boltPlan(b.seconds);
  const mine = store.routines(prof.id).filter((r) => r.active !== false);
  const items = plan.items.map((it) => {
    const ex = byId(it.id);
    const amount = it.min ? `${it.min} min al día` : ex.mode === 'pausas' ? `${ex.pattern} al día` : '';
    const has = mine.some((r) => r.exerciseId === ex.id);
    const add = ex.mode === 'serie' ? ''
      : has ? `<span class="row muted" style="gap:4px;min-height:44px">${icon('check', 15)} Ya está en tus rutinas</span>`
        : `<a class="btn small" href="#/planear?ex=${ex.id}${it.min ? `&min=${it.min}` : ''}&de=progreso">${icon('plus', 14)} Agregar a mis rutinas</a>`;
    return `<div class="tile">
      <div class="between" style="gap:8px;align-items:flex-start"><span style="font-weight:600;font-size:15px;min-width:0">${esc(ex.name)}</span>${amount ? `<span class="muted" style="flex:none;text-align:right">${esc(amount)}</span>` : ''}</div>
      <p class="muted" style="margin:4px 0 0">${esc(it.why)}</p>
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
        <a class="btn small" href="#/configurar/${ex.id}${it.min ? `?min=${it.min}` : ''}">${icon('play', 14)} Probar</a>${add}
      </div>
    </div>`;
  }).join('');
  return `<div class="card" id="plan">
    <span class="chip sage">${icon('leaf', 14)} Tu plan · BOLT ${b.morning ? 'de la mañana ' : ''}${b.seconds} s</span>
    <h2 class="h2" style="margin-top:12px">${esc(plan.title)}</h2>
    <p class="sub" style="margin-top:4px">${esc(plan.why)}</p>
    ${progHtml}
    <div class="stack" style="margin-top:12px;gap:10px">${items}</div>
    <p class="row" style="gap:8px;margin:14px 0 0;font-size:14px;color:var(--text2);align-items:flex-start">${icon('sun', 16, 'style="color:var(--arena);flex:none;margin-top:2px"')}<span>${esc(plan.habit)}</span></p>
    <p class="muted" style="margin:10px 0 0;font-size:12px">Basado en Oxygen Advantage.${teacher && !prof.role ? ` ${esc(teacher.name)} puede ajustarlo con un programa.` : ''}</p>
  </div>`;
}

export default {
  tab: 'progreso',
  render(ctx) {
    const { store, query } = ctx;
    const prof = ctx.profile;
    const kind = prof.kind;
    const p = ['dia', '7d', 'mes'].includes(query.get('p')) ? query.get('p') : '7d';
    const o = Math.min(0, Number(query.get('o')) || 0);
    const per = period(p, o);
    const a = dayKey(per.from), b = dayKey(per.to);
    const list = store.sessions(prof.id).filter((s) => s.day >= a && s.day <= b).sort((x, y) => y.startedAt.localeCompare(x.startedAt));
    const total = list.reduce((sum, s) => sum + s.durationSec / 60, 0);

    // Gamificación arriba.
    const lv = store.level(prof.id);
    const badges = store.badgeStatus(prof.id);
    const earned = badges.filter((x) => x.earned).sort((x, y) => y.earnedAt.localeCompare(x.earnedAt));
    const game = `<a class="card" href="#/logros" style="display:block;color:inherit;text-decoration:none">
      <div class="between">
        <div><p class="muted" style="margin:0">Tu nivel</p><p class="h2" style="margin-top:2px">${esc(lv.name)}</p></div>
        <span class="row" style="gap:6px;color:var(--hoja);font-weight:600">${icon('leaf', 18)} ${lv.points} ${lv.points === 1 ? "hoja" : "hojas"}</span>
      </div>
      <div style="margin-top:12px">${bar(lv.pct)}</div>
      <p class="muted" style="margin:8px 0 0">${lv.next ? `Te faltan ${lv.toNext} ${lv.toNext === 1 ? "hoja" : "hojas"} para ${esc(lv.next.name)}` : '¡Nivel más alto!'}</p>
      <div class="between" style="margin-top:14px">
        <span class="row" style="gap:8px">${icon('flame', 20, 'style="color:var(--brasa)"')}<span><span class="num" style="font-size:22px">${store.streak(prof.id)}</span> <span class="muted">${store.streak(prof.id) === 1 ? "día seguido" : "días seguidos"}</span></span></span>
        <span class="row" style="gap:6px">${earned.slice(0, 3).map((x) => medallion(x, 36)).join('') || `<span class="muted">${earned.length} ${earned.length === 1 ? "insignia" : "insignias"}</span>`}</span>
      </div>
      <p class="row" style="gap:6px;margin:14px 0 0;color:var(--sage);font-size:14px;font-weight:600">${earned.length} ${earned.length === 1 ? "insignia" : "insignias"} · Ver mis logros ${icon('chev', 16)}</p>
    </a>`;

    const seg = `<div class="seg" role="group" aria-label="Periodo" style="margin-top:22px">
      ${[['dia', 'Día'], ['7d', '7 días'], ['mes', 'Mes']].map(([k, l]) => `<a href="#/progreso?p=${k}" ${k === p ? 'aria-current="page"' : ''}>${l}</a>`).join('')}
    </div>`;
    const nav = `<div class="between" style="margin-top:14px">
      <a class="icon-btn" href="#/progreso?p=${p}&o=${o - 1}" aria-label="Periodo anterior">${icon('back', 20)}</a>
      <span style="font-weight:600">${esc(per.label)}</span>
      ${o < 0 ? `<a class="icon-btn" href="#/progreso?p=${p}&o=${o + 1}" aria-label="Periodo siguiente">${icon('chev', 20)}</a>` : '<span style="width:44px"></span>'}
    </div>`;

    const values = per.buckets.map(([label, fn]) => [label, list.filter(fn).reduce((sum, s) => sum + s.durationSec / 60, 0)]);
    const max = Math.max(10, ...values.map((v) => v[1]));
    const chart = `<div class="row" style="align-items:flex-end;gap:8px;height:130px;margin-top:16px">
      ${values.map(([label, v], i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
        <span class="muted" style="font-size:11px">${v >= 1 ? Math.floor(v) : ''}</span>
        <div style="width:100%;max-width:30px;border-radius:10px;height:${Math.max(4, Math.round((v / max) * 92))}px;background:${i === values.length - 1 && o === 0 ? 'var(--sage)' : 'rgba(156,197,161,0.38)'}"></div>
        <span class="muted" style="font-size:11px">${esc(label)}</span></div>`).join('')}
    </div>`;

    const byType = {};
    list.forEach((s) => { byType[s.exerciseId] = (byType[s.exerciseId] || 0) + s.durationSec / 60; });
    const types = Object.entries(byType).sort((x, y) => y[1] - x[1]);
    const typesHtml = types.map(([id, m]) => {
      const ex = byId(id);
      const color = ex ? GOALS[ex.goal].color : 'var(--sage)';
      return `<div><div class="between" style="font-size:14px"><span class="row" style="gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${esc(ex ? nameFor(ex, kind) : id)}</span>
        <span class="muted" style="font-size:13px">${minText(m)}</span></div><div style="margin-top:6px">${bar((m / (total || 1)) * 100, color)}</div></div>`;
    }).join('');

    const history = list.slice(0, 30).map((s) => {
      const d = new Date(s.startedAt);
      const ex = byId(s.exerciseId);
      return `<div class="list-row">
        <div style="flex:1;min-width:0"><p style="margin:0;font-size:14px">${esc(ex ? nameFor(ex, kind) : 'Sesión')}</p>
        <p class="muted" style="margin:1px 0 0">${DIAS_C[dow(d)]} ${d.getDate()} ${MES_C(d.getMonth())} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}</p></div>
        <span class="chip ${s.routineId ? 'arena' : 'brasa'}">${s.routineId ? 'Rutina' : 'Extra'}</span>
        <span class="num" style="font-size:18px;min-width:56px;text-align:right">${minText(s.durationSec / 60)}</span></div>`;
    }).join('');

    const empty = `<div class="tile" style="margin-top:16px;text-align:center"><p class="sub">${kind === 'adulto' ? 'Aún no hay sesiones en este periodo.' : '¡Estos días aún no hay ejercicios! ¿Empezamos!'}</p>
      <a class="btn primary" href="#/inicio" style="margin-top:12px">Empezar a respirar</a></div>`;

    return `<div class="top"><h1 class="h1">Tu progreso</h1></div>
      ${game}
      ${seg}
      ${nav}
      ${kind === 'adulto' ? measureCards(store, prof, per, p) : ''}
      <div class="card" style="margin-top:12px">
        <p class="muted" style="margin:0">Tiempo respirando</p>
        <p class="num" style="margin:4px 0 0;font-size:34px">${minText(total)}</p>
        <p class="muted" style="margin:2px 0 0">${list.length} ${list.length === 1 ? 'sesión' : 'sesiones'}</p>
        ${chart}
      </div>
      ${list.length ? `<p class="label">Por tipo de ejercicio</p><div class="stack">${typesHtml}</div>
        <p class="label">Historial</p><div>${history}</div>` : empty}`;
  },
  mount(root, ctx) {
    // Desde «Tu plan» en Inicio se llega directo a la tarjeta.
    if (ctx.query.get('plan')) root.querySelector('#plan')?.scrollIntoView({ block: 'start' });
    return mountTrends(root);
  },
};
