import { esc, icon } from '../ui.js';
import { exercisesFor, nameFor, GOALS } from '../catalog.js';

export default {
  tab: 'inicio',
  render(ctx) {
    const kind = ctx.profile.kind;
    const f = ctx.query.get('f') || 'todos';
    const list = exercisesFor(kind);
    const goals = ['todos', ...new Set(list.map((e) => e.goal))];
    const shown = list.filter((e) => f === 'todos' || e.goal === f);
    const general = shown.filter((e) => !e.reduced);
    const reduced = shown.filter((e) => e.reduced);
    const card = (e) => {
      const g = GOALS[e.goal];
      return `<a href="#/configurar/${e.id}" class="card row" style="padding:16px;color:inherit;text-decoration:none">
        <span style="width:10px;height:10px;border-radius:50%;background:${g.color};flex:none"></span>
        <span style="flex:1;min-width:0"><span style="display:block;font-size:16px;font-weight:600">${esc(nameFor(e, kind))}</span>
        <span class="muted" style="font-size:13px">${esc(e.pattern)} · ${esc(g.label)}</span></span>
        ${icon('chev', 18, 'style="color:var(--muted)"')}</a>`;
    };
    return `<div class="top"><a class="icon-btn" href="#/inicio" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Ejercicios</h1></div>
      <div class="pills" role="group" aria-label="Filtrar por objetivo">
        ${goals.map((k) => `<a class="pill" style="display:inline-flex;align-items:center;text-decoration:none" href="#/catalogo?f=${k}" aria-pressed="${k === f}">${k === 'todos' ? 'Todos' : esc(GOALS[k].label)}</a>`).join('')}
      </div>
      <div class="stack" style="margin-top:16px">${general.map(card).join('')}</div>
      ${reduced.length ? `<p class="label">Respiración reducida</p><div class="stack">${reduced.map(card).join('')}</div>` : ''}
      <p class="muted" style="margin-top:22px;display:flex;gap:8px;align-items:center">${icon('nose', 16)} En Calmo todo se respira por la nariz.</p>`;
  },
};
