// Detalle de un alumno para la maestra: mensajes, plan contra lo hecho, BOLT, pasos,
// sesiones recientes y sus metas y rutinas (las puede ajustar).

import { esc, icon, avatar, toast, askConfirm, addDays, MESES } from '../ui.js';
import { nameFor, byId } from '../catalog.js';
import { kindLabel, familyCard, manageGoals } from './perfil.js';
import { boltPoints, stepPoints, recentSpan, trendChart, mountTrends } from '../trend.js';
import { constancy, lightDot } from './alumnos.js';
import { bubbles } from './mensajes.js';

// Notas de un toque; también se puede escribir una propia.
// Lo que se lleva escrito para cada alumno sigue ahí si la pantalla se vuelve a dibujar.
const drafts = {};
const QUICK_NOTES = ['¡Vas muy bien!', 'Practica antes de dormir', 'Respira suave y por la nariz', 'Mantén la boca cerrada al caminar'];

const shortDate = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};
const clockOf = (iso) => new Date(iso).toTimeString().slice(0, 5);

// Plan contra lo hecho en los últimos 7 días.
function planned(store, id) {
  let total = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    store.agenda(id, addDays(new Date(), -i)).filter((it) => it.type === 'plan').forEach((it) => {
      total += 1;
      if (it.status === 'hecha') done += 1;
    });
  }
  return { total, done };
}

export default {
  tab: 'alumnos',
  render(ctx) {
    const { store } = ctx;
    const p = store.profiles().find((x) => x.id === ctx.params[0] && x.role !== 'maestra');
    if (!p) return `<div class="top"><a class="icon-btn" href="#/alumnos" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Alumno</h1></div><p class="sub">No encontramos a esa persona.</p>`;
    const c = constancy(store, p.id);
    const plan = planned(store, p.id);
    const byTime = (list) => list.slice().sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    const bolts = byTime(store.bolt(p.id));
    const allSteps = byTime(store.steps(p.id));
    const steps = allSteps.slice(-5).reverse();
    const g = store.goals(p.id);
    // Las últimas 10 mediciones en una línea que se toca para ver fecha y valor.
    const line = (list, points, opts) => (list.length ? trendChart(points(list.slice(-10)), { per: recentSpan(list.slice(-10)), p: 'ultimas', scope: 'en sus últimas mediciones', ...opts }) : '');
    const sessions = store.sessions(p.id).slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 10);
    // Los últimos mensajes; los que el alumno escribió y ella no ha visto llevan «Nuevo».
    const notes = store.thread(p.id).slice(-8);
    const fresh = new Set(store.unreadReplies(p.id).map((n) => n.id));
    const boltWord = p.kind === 'adulto' ? 'BOLT' : 'Reto del aire';

    const notesHtml = `<div class="card">
      <h2 class="h3" style="margin:0">Mensajes con ${esc(p.name)}</h2>
      ${notes.length ? `<div class="thread" style="margin-top:12px">${bubbles(store, notes, ctx.profile.id, { fresh, del: true })}</div>` : `<p class="muted" style="margin:6px 0 0">Todavía no hay mensajes.${p.kind === 'adulto' ? ` ${esc(p.name)} te puede responder desde Calmo.` : ''}</p>`}
      <div class="pills" style="margin-top:12px">${QUICK_NOTES.map((t, i) => `<button type="button" class="pill" data-quick="${i}">${esc(t)}</button>`).join('')}</div>
      <form id="noteForm" class="row" style="margin-top:10px;gap:8px" novalidate>
        <input class="field" name="text" maxlength="280" autocomplete="off" placeholder="Escribe una nota" aria-label="Nota para ${esc(p.name)}" value="${esc(drafts[p.id] || '')}" style="flex:1;min-width:0">
        <button class="btn primary small" type="submit">Enviar</button>
      </form>
    </div>`;

    const boltHtml = `<div class="card">
      <div class="between"><h2 class="h3" style="margin:0">${boltWord}</h2><span class="muted">${bolts.length ? `${bolts.at(-1).seconds} s · meta ${g.bolt} s` : 'Sin medir'}</span></div>
      ${line(bolts, boltPoints, { goal: g.bolt, color: 'var(--sage)', what: boltWord, unit: ' s' })}
      ${bolts.length ? `<p class="muted" style="margin:8px 0 0">${bolts.slice(-5).reverse().map((m) => `${shortDate(m.takenAt)}: ${m.seconds} s`).join(' · ')}</p>` : ''}
    </div>`;

    const stepsHtml = p.kind === 'peque' ? '' : `<div class="card">
      <div class="between"><h2 class="h3" style="margin:0">Pasos sin respirar</h2><span class="muted">Récord ${store.bestSteps(p.id) || '—'}</span></div>
      ${line(allSteps, stepPoints, { goal: g.steps, color: 'var(--hoja)', what: 'Pasos', unit: ' pasos' })}
      ${steps.length ? `<div class="stack" style="margin-top:8px;gap:4px">${steps.map((m) => `<p class="muted" style="margin:0">${shortDate(m.takenAt)}: ${m.series ? m.series.join(' · ') : m.steps} pasos</p>`).join('')}</div>` : '<p class="muted" style="margin:8px 0 0">Todavía no hace la serie caminando.</p>'}
    </div>`;

    const sessionsHtml = `<div class="card" style="padding-top:12px;padding-bottom:6px">
      <h2 class="h3" style="margin:0 0 4px">Sesiones recientes</h2>
      ${sessions.length ? sessions.map((s) => `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--line);gap:10px">
        <span style="min-width:0"><span style="display:block;font-size:14px">${esc(byId(s.exerciseId) ? nameFor(byId(s.exerciseId), 'adulto') : 'Sesión')}</span>
        <span class="muted" style="font-size:12px">${shortDate(s.startedAt)} · ${clockOf(s.startedAt)}${s.controlPauses?.length ? ` · pausas ${s.controlPauses.join(' → ')} s` : ''}</span></span>
        <span class="muted" style="flex:none">${Math.max(1, Math.floor(s.durationSec / 60))} min${s.routineId ? '' : ' · extra'}</span></div>`).join('') : '<p class="muted" style="margin:8px 0">Todavía no hay sesiones.</p>'}
    </div>`;

    return `<div class="top"><a class="icon-btn" href="#/alumnos" aria-label="Volver">${icon('back', 20)}</a><span></span></div>
      <div class="row" style="gap:14px">${avatar(p, 64)}
        <div style="flex:1;min-width:0"><h1 class="h1">${esc(p.name)}</h1><p class="sub" style="margin:2px 0 0">${esc(kindLabel(p))}</p></div></div>
      <div class="grid2" style="margin-top:14px">
        <div class="tile"><span class="row" style="gap:6px">${lightDot(c.light)}<span class="num" style="font-size:24px">${c.n}</span><span class="muted">de 7 días</span></span><p class="muted" style="margin:4px 0 0">Constancia</p></div>
        <a class="tile" href="#/calendario?p=${esc(p.id)}" style="color:inherit;text-decoration:none"><span class="num" style="font-size:24px">${plan.done}</span><span class="muted"> de ${plan.total}</span><p class="muted" style="margin:4px 0 0">Planeadas hechas · ver calendario</p></a>
      </div>
      <a class="btn primary block" href="#/asignar?p=${esc(p.id)}" style="margin-top:14px">${icon('plus', 18)} Asignar práctica a ${esc(p.name)}</a>
      <div class="stack" style="margin-top:14px">
        ${notesHtml}
        ${boltHtml}
        ${stepsHtml}
        ${sessionsHtml}
        ${familyCard(store, p, 'alumno')}
      </div>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const id = ctx.params[0];
    const stop = manageGoals(root, ctx);
    const stopTrends = mountTrends(root);
    // Abrir el detalle deja leído lo que el alumno le escribió.
    store.markThreadRead(id);
    const box = root.querySelector('#noteForm [name="text"]');
    box?.addEventListener('input', () => { drafts[id] = box.value; });
    const send = async (text) => {
      if (!store.addNote(id, text)) return;
      delete drafts[id];
      toast('Nota enviada');
      await rerender();
    };
    const onClick = (e) => {
      const q = e.target.closest('[data-quick]');
      if (q) { send(QUICK_NOTES[Number(q.dataset.quick)]); return; }
      const del = e.target.closest('[data-del-note]');
      if (del) {
        askConfirm('¿Borrar este mensaje? También se borra para tu alumno.', { ok: 'Borrar' }).then((ok) => { if (ok) { store.removeNote(del.dataset.delNote); rerender(); } });
      }
    };
    const onSubmit = (e) => {
      if (e.target.id !== 'noteForm') return;
      e.preventDefault();
      const text = e.target.elements.namedItem('text').value.trim();
      if (text) send(text);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    return () => { root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); if (stop) stop(); stopTrends(); };
  },
};
