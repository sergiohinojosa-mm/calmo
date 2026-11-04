import { esc, icon, dayKey, fromKey, addDays, dow, DIAS_C, DIAS_L, MESES, DIAS } from '../ui.js';
import { nameFor } from '../catalog.js';
import * as store from '../store.js';

const MES_C = (i) => MESES[i].slice(0, 3);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

const STATUS = {
  hecha: `<span class="row" style="gap:5px;color:var(--hoja);font-size:13px">${icon('check', 16)} Hecha</span>`,
  pendiente: '<span class="row" style="gap:6px;color:var(--sage);font-size:13px"><span style="width:12px;height:12px;border-radius:50%;border:1.5px solid var(--sage)"></span> Pendiente</span>',
  no: '<span class="row" style="gap:6px;color:var(--muted);font-size:13px"><span style="width:12px;height:12px;border-radius:50%;border:1.5px solid #6B7A70"></span> No realizada</span>',
  extra: `<span class="row" style="gap:5px;color:var(--brasa);font-size:13px">${icon('plus', 16)} Hecha</span>`,
};

// Qué significa cada color, con los mismos íconos de las tarjetas.
const LEGEND = `<div class="tile row" style="margin-top:10px;padding:10px 14px;gap:6px 14px;flex-wrap:wrap;font-size:12px">
  <span class="row" style="gap:5px;color:var(--sage)"><span style="width:11px;height:11px;border-radius:50%;border:1.5px solid var(--sage)"></span>Pendiente</span>
  <span class="row" style="gap:4px;color:var(--hoja)">${icon('check', 14)}Hecha</span>
  <span class="row" style="gap:5px;color:var(--muted)"><span style="width:11px;height:11px;border-radius:50%;border:1.5px solid #6B7A70"></span>No realizada</span>
  <span class="row" style="gap:4px;color:var(--brasa)">${icon('plus', 14)}Extra</span>
</div>`;

// «De <maestra>»: el nombre de la maestra que asignó la rutina.
const teacherName = (r) => {
  const t = store.profiles().find((p) => p.id === r.by && p.role === 'maestra');
  return `De ${t ? t.name : 'tu maestra'}`;
};

// Enlaces del calendario que conservan de quién es (?p=<id>).
function link(who, params) {
  const q = new URLSearchParams(params);
  if (who) q.set('p', who);
  return `#/calendario?${q}`;
}

// Hora y duración: lo hecho muestra cuándo y cuánto fue de verdad.
function when(it) {
  if (it.type === 'extra' && it.measure) return `${esc(it.time)} · ${it.measure.seconds} s`;
  if (it.status !== 'hecha' || !it.realTime) return `${esc(it.time)}${it.minutes ? ` · ${it.minutes} min` : ''}`;
  const amount = it.realMinutes ? ` · ${it.realMinutes} min` : it.measure ? ` · ${it.measure.seconds} s` : '';
  return `${esc(it.realTime)}${amount}${it.realTime !== it.time ? `<span style="color:var(--muted)"> · plan ${esc(it.time)}</span>` : ''}`;
}

// view: { kind, isToday, own, edit, who }. Empezar solo en el calendario propio;
// los adultos tocan una rutina para editarla.
function itemCard(it, view) {
  const { kind } = view;
  const isBolt = it.type === 'plan' && it.routine.kind === 'bolt';
  const boltExtra = it.type === 'extra' && it.measure;
  const title = (isBolt || boltExtra) && kind !== 'adulto' ? 'Reto del aire' : it.title;
  const exName = it.exercise ? nameFor(it.exercise, kind) : (isBolt ? (kind === 'adulto' ? 'BOLT score' : 'Reto del aire') : '');
  const start = isBolt ? `#/bolt?rutina=${it.routine.id}` : `#/configurar/${it.exercise?.id}?min=${it.minutes}&rutina=${it.routine?.id}`;
  const edit = view.edit && it.type === 'plan' && !it.routine.deletedAt
    ? `planear?editar=${encodeURIComponent(it.routine.id)}${view.who ? `&p=${encodeURIComponent(view.who)}` : ''}` : '';
  return `<div class="tile" style="border:1px solid var(--line)${edit ? ';cursor:pointer' : ''}" ${edit ? `data-edit="${esc(edit)}"` : ''}>
    <div class="between">
      ${it.type === 'extra' ? '<span class="chip brasa">Extra</span>' : it.routine.source === 'maestra' ? `<span class="chip sage">${icon('repeat', 13)} ${esc(teacherName(it.routine))}</span>` : `<span class="chip arena">${icon('repeat', 13)} Rutina</span>`}
      ${STATUS[it.status]}
    </div>
    <p style="margin:8px 0 0;font-size:15px;font-weight:600">${edit ? `<a href="#/${esc(edit)}" style="color:inherit;text-decoration:none" aria-label="Editar rutina ${esc(title)} ${esc(it.time)}">${esc(title)}</a>` : esc(title)}</p>
    ${exName && exName !== title ? `<p class="muted" style="margin:2px 0 0">${esc(exName)}</p>` : ''}
    <div class="between" style="margin-top:10px">
      <span class="row muted" style="gap:6px;font-size:13px">${icon('timer', 15)} ${when(it)}</span>
      ${view.own && view.isToday && it.status === 'pendiente' && (isBolt || it.exercise) ? `<a class="btn primary small" ${isBolt ? '' : 'data-audio'} href="${start}">${icon('play', 14)} Empezar</a>` : ''}
    </div>
  </div>`;
}

function dayView(store, me, view, w) {
  const today = new Date();
  const monday = addDays(addDays(today, -dow(today)), w * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const first = days[0], last = days[6];
  const range = `${first.getDate()}${first.getMonth() !== last.getMonth() ? ` ${MES_C(first.getMonth())}` : ''} – ${last.getDate()} ${MES_C(last.getMonth())}`;
  let planned = 0, done = 0, extra = 0;
  const rows = days.map((d) => {
    const items = store.agenda(me.id, d);
    items.forEach((it) => {
      if (it.type === 'plan') { planned += 1; if (it.status === 'hecha') done += 1; } else extra += 1;
    });
    const isToday = dayKey(d) === dayKey(today);
    return `<div class="daycol">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span class="muted" style="font-size:13px">${DIAS_C[dow(d)]}</span><span class="daynum ${isToday ? 'today' : ''}">${d.getDate()}</span></div>
      <div class="stack" style="gap:8px">${items.length ? items.map((it) => itemCard(it, { ...view, isToday })).join('') : '<p class="muted" style="margin:10px 0 0;font-size:13px">Sin sesiones</p>'}</div>
    </div>`;
  }).join('');
  return `<div class="between" style="margin-top:16px">
      <div><p style="margin:0;font-size:15px;font-weight:600">Semana ${isoWeek(first)} <span style="font-weight:400;color:var(--text2)">· ${range}</span></p>
      <p class="muted" style="margin:2px 0 0">${done} de ${planned} planeadas · ${extra} extra</p></div>
      <div class="row" style="gap:6px">
        <a class="icon-btn" href="${link(view.who, { v: 'dias', w: w - 1 })}" aria-label="Semana anterior">${icon('back', 20)}</a>
        <a class="icon-btn" href="${link(view.who, { v: 'dias', w: w + 1 })}" aria-label="Semana siguiente">${icon('chev', 20)}</a>
      </div>
    </div>
    ${LEGEND}
    <div style="margin-top:8px">${rows}</div>`;
}

// Lo que tiene un día, en palabras (para lectores de pantalla).
function summary(items) {
  if (!items.length) return '';
  const n = (st) => items.filter((it) => it.status === st).length;
  const parts = [[n('hecha'), 'hecha', 'hechas'], [n('pendiente'), 'pendiente', 'pendientes'], [n('no'), 'no realizada', 'no realizadas'], [n('extra'), 'extra', 'extras']]
    .filter(([c]) => c).map(([c, one, many]) => `${c} ${c === 1 ? one : many}`);
  return `: ${parts.join(', ')}`;
}

function monthView(store, me, view, m, dParam) {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + m, 1);
  const start = addDays(first, -dow(first));
  const inMonth = (d) => d.getMonth() === first.getMonth();
  let sel = dParam ? fromKey(dParam) : (m === 0 ? today : first);
  if (!inMonth(sel) && !dParam) sel = first;
  const selKey = dayKey(sel);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i);
    const key = dayKey(d);
    const items = store.agenda(me.id, d);
    const dots = items.slice(0, 4).map((it) => `<span class="dot ${it.status === 'hecha' ? 'done' : it.status === 'pendiente' ? 'pending' : it.status === 'no' ? 'missed' : 'extra'}"></span>`).join('');
    const on = key === selKey;
    return `<a href="${link(view.who, { v: 'mes', m, d: key })}" class="${key === dayKey(today) ? 'today' : ''} ${inMonth(d) ? '' : 'out'}" ${on ? 'aria-current="true" style="border-color:var(--sage)"' : ''} aria-label="${key === dayKey(today) ? 'Hoy, ' : ''}${d.getDate()} de ${MESES[d.getMonth()]}${summary(items)}">
      <span class="num" style="font-size:15px">${d.getDate()}</span><span class="dots">${dots}</span></a>`;
  }).join('');
  const items = store.agenda(me.id, sel);
  const title = `${selKey === dayKey(today) ? 'Hoy, ' : ''}${DIAS[dow(sel)]} ${sel.getDate()} de ${MESES[sel.getMonth()]}`;
  return `<div class="card" style="margin-top:16px;padding:12px 10px">
      <div class="between" style="padding:0 4px 8px">
        <a class="icon-btn" href="${link(view.who, { v: 'mes', m: m - 1 })}" aria-label="Mes anterior" style="background:transparent">${icon('back', 20)}</a>
        <span style="font-weight:600">${cap(MESES[first.getMonth()])} ${first.getFullYear()}</span>
        <a class="icon-btn" href="${link(view.who, { v: 'mes', m: m + 1 })}" aria-label="Mes siguiente" style="background:transparent">${icon('chev', 20)}</a>
      </div>
      <div class="month" style="text-align:center;margin-bottom:4px">${DIAS_L.map((l) => `<span class="muted" style="font-size:11px">${l}</span>`).join('')}</div>
      <div class="month">${cells}</div>
      <div class="row muted" style="justify-content:center;gap:12px;margin-top:10px;font-size:11px;flex-wrap:wrap">
        <span class="row" style="gap:4px"><span class="dot done"></span>Hecha</span><span class="row" style="gap:4px"><span class="dot pending"></span>Pendiente</span>
        <span class="row" style="gap:4px"><span class="dot missed"></span>No realizada</span><span class="row" style="gap:4px"><span class="dot extra"></span>Extra</span>
      </div>
    </div>
    <p class="label">${esc(cap(title))}</p>
    <div class="stack" style="gap:8px">${items.length ? items.map((it) => itemCard(it, { ...view, isToday: selKey === dayKey(today) })).join('') : '<p class="muted" style="font-size:13px">Sin sesiones</p>'}</div>`;
}

// De quién es el calendario: un adulto puede ver el de quienes cuida (?p=<id>).
function viewed(ctx) {
  const { store, query } = ctx;
  const me = ctx.profile;
  const asked = query.get('p');
  return asked && asked !== me.id && store.canManage(me.id, asked) ? store.profile(asked) : me;
}

export default {
  tab: 'calendario',
  render(ctx) {
    const { store, query } = ctx;
    const me = ctx.profile;
    const them = viewed(ctx);
    const who = them.id === me.id ? null : them.id;
    const view = { kind: them.kind, own: !who, edit: me.kind === 'adulto', who };
    const v = query.get('v') === 'mes' ? 'mes' : 'dias';
    const body = v === 'mes'
      ? monthView(store, them, view, Number(query.get('m')) || 0, query.get('d'))
      : dayView(store, them, view, Number(query.get('w')) || 0);
    const people = me.kind === 'adulto' ? store.profiles().filter((p) => store.canManage(me.id, p.id) && (p.id === me.id || p.role !== 'maestra')) : [];
    const keep = {};
    ['v', 'w', 'm', 'd'].forEach((k) => { if (query.get(k)) keep[k] = query.get(k); });
    const picker = people.length > 1 ? `<p class="muted" style="margin:14px 0 6px">De quién</p>
      <div class="pills" role="group" aria-label="De quién">
        ${people.map((p) => `<a class="pill" href="${link(p.id === me.id ? null : p.id, keep)}" ${p.id === them.id ? 'aria-current="page"' : ''} style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">${esc(p.id === me.id ? 'Yo' : p.name)}</a>`).join('')}
      </div>` : '';
    const plan = me.kind === 'adulto' ? `<a class="icon-btn" href="#/planear${who ? `?p=${encodeURIComponent(who)}` : ''}" aria-label="Planear una rutina${who ? ` para ${esc(them.name)}` : ''}" style="background:var(--sage);color:var(--on-sage)">${icon('plus', 20)}</a>` : '';
    return `<div class="top">${me.kind === 'adulto' ? '' : `<a class="icon-btn" href="#/perfil" aria-label="Volver">${icon('back', 20)}</a>`}<h1 class="h1">${me.kind === 'adulto' ? 'Calendario' : 'Mi semana'}</h1>${plan}</div>
      <div class="seg" role="group" aria-label="Vista">
        <a href="${link(who, { v: 'dias' })}" ${v === 'dias' ? 'aria-current="page"' : ''}>Días</a>
        <a href="${link(who, { v: 'mes' })}" ${v === 'mes' ? 'aria-current="page"' : ''}>Mes</a>
      </div>
      ${picker}
      ${body}`;
  },
  mount(root, ctx) {
    // Tocar la tarjeta de una rutina abre su edición (los botones y enlaces siguen funcionando).
    const onClick = (e) => {
      const card = e.target.closest('[data-edit]');
      if (!card || e.target.closest('a, button')) return;
      ctx.go(card.dataset.edit);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
