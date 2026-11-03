import { esc, icon } from '../ui.js';
import { exercisesFor, textsFor, goalLabel, GOALS } from '../catalog.js';

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
      const t = textsFor(e, kind);
      return `<a href="#/configurar/${e.id}" class="card row" style="padding:16px;color:inherit;text-decoration:none">
        <span style="width:10px;height:10px;border-radius:50%;background:${g.color};flex:none"></span>
        <span style="flex:1;min-width:0"><span style="display:block;font-size:16px;font-weight:600">${esc(t.name)}</span>
        <span class="muted" style="font-size:13px">${esc(t.pattern)} · ${esc(goalLabel(e.goal, kind))}</span></span>
        ${icon('chev', 18, 'style="color:var(--muted)"')}</a>`;
    };
    return `<div class="top"><a class="icon-btn" href="#/inicio" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Ejercicios</h1></div>
      <div class="pills" role="group" aria-label="Filtrar por objetivo">
        ${goals.map((k) => `<a class="pill" style="display:inline-flex;align-items:center;text-decoration:none" href="#/catalogo?f=${k}" ${k === f ? 'aria-current="page"' : ''}>${k === 'todos' ? 'Todos' : esc(goalLabel(k, kind))}</a>`).join('')}
      </div>
      <div class="stack" style="margin-top:16px">${general.map(card).join('')}</div>
      ${reduced.length ? `<p class="label">${kind === 'adulto' ? 'Respiración reducida' : 'Para tener más aire'}</p><div class="stack">${reduced.map(card).join('')}</div>` : ''}
      <p class="muted" style="margin-top:22px;display:flex;gap:8px;align-items:center">${icon('nose', 16)} En Calmo todo se respira por la nariz.</p>`;
  },
};
