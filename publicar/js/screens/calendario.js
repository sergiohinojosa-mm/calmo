import { esc, icon, dayKey, fromKey, addDays, dow, DIAS_C, DIAS_L, MESES, DIAS } from '../ui.js';
import { nameFor } from '../catalog.js';

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
  extra: `<span class="row" style="gap:5px;color:var(--brasa);font-size:13px">${icon('check', 16)} Hecha</span>`,
};

function itemCard(it, kind, isToday) {
  const isBolt = it.type === 'plan' && it.routine.kind === 'bolt';
  const title = isBolt && kind !== 'adulto' ? 'Reto del aire' : it.title;
  const exName = it.exercise ? nameFor(it.exercise, kind) : (isBolt ? (kind === 'adulto' ? 'BOLT score' : 'Aguanta tranquila') : '');
  const start = isBolt ? '#/bolt' : `#/configurar/${it.exercise?.id}?min=${it.minutes}&rutina=${it.routine?.id}`;
  return `<div class="tile" style="border:1px solid var(--line)">
    <div class="between">
      ${it.type === 'extra' ? '<span class="chip brasa">Extra</span>' : `<span class="chip arena">${icon('repeat', 13)} Rutina</span>`}
      ${STATUS[it.status]}
    </div>
    <p style="margin:8px 0 0;font-size:15px;font-weight:600">${esc(title)}</p>
    ${exName && exName !== title ? `<p class="muted" style="margin:2px 0 0">${esc(exName)}</p>` : ''}
    <div class="between" style="margin-top:10px">
      <span class="row muted" style="gap:6px;font-size:13px">${icon('timer', 15)} ${esc(it.time)}${it.minutes ? ` · ${it.minutes} min` : ''}</span>
      ${isToday && it.status === 'pendiente' ? `<a class="btn primary small" ${isBolt ? '' : 'data-audio'} href="${start}">${icon('play', 14)} Empezar</a>` : ''}
    </div>
  </div>`;
}

function dayView(store, me, kind, w) {
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
      <div class="stack" style="gap:8px">${items.length ? items.map((it) => itemCard(it, kind, isToday)).join('') : '<p class="muted" style="margin:10px 0 0;font-size:13px">Sin sesiones</p>'}</div>
    </div>`;
  }).join('');
  return `<div class="between" style="margin-top:16px">
      <div><p style="margin:0;font-size:15px;font-weight:600">Semana ${isoWeek(first)} <span style="font-weight:400;color:var(--text2)">· ${range}</span></p>
      <p class="muted" style="margin:2px 0 0">${done} de ${planned} planeadas · ${extra} extra</p></div>
      <div class="row" style="gap:6px">
        <a class="icon-btn" href="#/calendario?v=dias&w=${w - 1}" aria-label="Semana anterior">${icon('back', 20)}</a>
        <a class="icon-btn" href="#/calendario?v=dias&w=${w + 1}" aria-label="Semana siguiente">${icon('chev', 20)}</a>
      </div>
    </div>
    <div style="margin-top:8px">${rows}</div>`;
}

function monthView(store, me, kind, m, dParam) {
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
    return `<a href="#/calendario?v=mes&m=${m}&d=${key}" class="${key === dayKey(today) ? 'today' : ''} ${inMonth(d) ? '' : 'out'}" aria-pressed="${key === selKey}" aria-label="${d.getDate()} de ${MESES[d.getMonth()]}">
      <span class="num" style="font-size:15px">${d.getDate()}</span><span class="dots">${dots}</span></a>`;
  }).join('');
  const items = store.agenda(me.id, sel);
  const title = `${selKey === dayKey(today) ? 'Hoy, ' : ''}${DIAS[dow(sel)]} ${sel.getDate()} de ${MESES[sel.getMonth()]}`;
  return `<div class="card" style="margin-top:16px;padding:12px 10px">
      <div class="between" style="padding:0 4px 8px">
        <a class="icon-btn" href="#/calendario?v=mes&m=${m - 1}" aria-label="Mes anterior" style="background:transparent">${icon('back', 20)}</a>
        <span style="font-weight:600">${cap(MESES[first.getMonth()])} ${first.getFullYear()}</span>
        <a class="icon-btn" href="#/calendario?v=mes&m=${m + 1}" aria-label="Mes siguiente" style="background:transparent">${icon('chev', 20)}</a>
      </div>
      <div class="month" style="text-align:center;margin-bottom:4px">${DIAS_L.map((l) => `<span class="muted" style="font-size:11px">${l}</span>`).join('')}</div>
      <div class="month">${cells}</div>
      <div class="row muted" style="justify-content:center;gap:12px;margin-top:10px;font-size:11px;flex-wrap:wrap">
        <span class="row" style="gap:4px"><span class="dot done"></span>Hecha</span><span class="row" style="gap:4px"><span class="dot pending"></span>Pendiente</span>
        <span class="row" style="gap:4px"><span class="dot missed"></span>No realizada</span><span class="row" style="gap:4px"><span class="dot extra"></span>Extra</span>
      </div>
    </div>
    <p class="label">${esc(cap(title))}</p>
    <div class="stack" style="gap:8px">${items.length ? items.map((it) => itemCard(it, kind, selKey === dayKey(today))).join('') : '<p class="muted" style="font-size:13px">Sin sesiones</p>'}</div>`;
}

export default {
  tab: 'calendario',
  render(ctx) {
    const { store, query } = ctx;
    const me = ctx.profile;
    const v = query.get('v') === 'mes' ? 'mes' : 'dias';
    const body = v === 'mes'
      ? monthView(store, me, me.kind, Number(query.get('m')) || 0, query.get('d'))
      : dayView(store, me, me.kind, Number(query.get('w')) || 0);
    return `<div class="top"><h1 class="h1">Calendario</h1>
        <a class="icon-btn" href="#/planear" aria-label="Planear una rutina" style="background:var(--sage);color:var(--on-sage)">${icon('plus', 20)}</a></div>
      <div class="seg" role="group" aria-label="Vista">
        <a href="#/calendario?v=dias" aria-pressed="${v === 'dias'}">Días</a>
        <a href="#/calendario?v=mes" aria-pressed="${v === 'mes'}">Mes</a>
      </div>
      ${body}`;
  },
};
