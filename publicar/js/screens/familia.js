import { esc, icon, bar, avatar } from '../ui.js';
import { familyCard, manageGoals } from './perfil.js';

const KIND = { adulto: 'Adulto', junior: 'Junior', peque: 'Peque' };

export default {
  tab: 'familia',
  render(ctx) {
    const { store, query } = ctx;
    const me = ctx.profile;
    const kidView = me.kind !== 'adulto';
    const v = query.get('v') === 'reto' ? 'reto' : 'ranking';
    const people = store.profiles().map((p) => {
      const mins = store.last7(p.id);
      const goal = store.goals(p.id).weekly || 1;
      return { p, mins, goal, pct: (mins / goal) * 100 };
    });

    const ranking = [...people].sort((a, b) => b.pct - a.pct || b.mins - a.mins).map((x, i) => {
      const left = Math.ceil(x.goal - x.mins);
      const mine = x.p.id === me.id;
      const line = left <= 0 ? '¡Meta cumplida!' : `${mine ? 'Te faltan' : 'Le faltan'} ${left} min para ${mine ? 'tu' : 'su'} meta`;
      return `<div class="row" style="padding:12px 0;border-bottom:1px solid var(--line)">
        <span class="num" style="width:22px;font-size:20px;color:var(--text2)">${i + 1}</span>
        ${avatar(x.p, 44)}
        <div style="flex:1;min-width:0">
          <div class="between"><span style="font-weight:600">${esc(x.p.name)}${mine ? ' <span class="muted">(tú)</span>' : ''}</span>
          <span class="row" style="gap:4px;font-size:14px">${i < 3 && x.mins > 0 ? icon('leaf', 16, 'style="color:var(--arena)"') : ''}${Math.round(Math.min(x.pct, 999))} %</span></div>
          <div style="margin-top:6px">${bar(x.pct, i < 3 && x.mins > 0 ? 'var(--arena)' : 'var(--sage)')}</div>
          <p class="muted" style="margin:6px 0 0">${line}</p>
        </div></div>`;
    }).join('');

    const sum = people.reduce((a, x) => a + x.mins, 0);
    const goalSum = people.reduce((a, x) => a + x.goal, 0);
    const reto = `<div class="card" style="margin-top:14px">
      <p class="muted" style="margin:0">Meta de la familia · últimos 7 días</p>
      <p class="num" style="margin:4px 0 0;font-size:34px">${Math.floor(sum)} <span style="font-size:16px;color:var(--text2)">de ${goalSum} min</span></p>
      <div style="margin-top:12px">${bar((sum / goalSum) * 100)}</div>
      <p class="muted" style="margin:8px 0 0">${sum >= goalSum ? '¡Lo lograron juntos!' : `Faltan ${Math.ceil(goalSum - sum)} min entre todos`}</p>
      <div class="stack" style="margin-top:16px">${people.map((x) => `<div class="row">${avatar(x.p, 32)}<span style="flex:1;font-size:14px">${esc(x.p.name)}</span>
        <span style="width:40%">${bar(sum ? (x.mins / sum) * 100 : 0, 'var(--hoja)')}</span><span class="muted" style="width:56px;text-align:right">${Math.floor(x.mins)} min</span></div>`).join('')}</div>
    </div>`;

    const cards = people.map((x) => {
      const lb = store.lastBolt(x.p.id);
      return `<div class="tile row" style="gap:12px">
        ${avatar(x.p, 44)}
        <div style="flex:1;min-width:0">
          <p style="margin:0;font-weight:600">${esc(x.p.name)}${x.p.id === me.id ? ' <span class="muted">(tú)</span>' : ''}${kidView ? '' : ` <span class="chip" style="margin-left:4px">${x.p.admin ? 'Admin' : KIND[x.p.kind]}</span>`}</p>
          <p class="muted" style="margin:4px 0 0">${store.streak(x.p.id)} ${store.streak(x.p.id) === 1 ? "día seguido" : "días seguidos"} · ${Math.floor(x.mins)} min en los últimos 7 días · ${kidView ? 'Reto del aire' : 'BOLT'} ${lb ? `${lb.seconds} s` : '—'}</p>
        </div></div>`;
    }).join('');

    return `<div class="top"><h1 class="h1">${kidView ? 'Mi familia' : esc(store.familyName())}</h1></div>
      <div class="seg" role="group" aria-label="Vista">
        <a href="#/familia?v=ranking" ${v === 'ranking' ? 'aria-current="page"' : ''}>${kidView ? '¿Cómo vamos?' : 'Ranking'}</a>
        <a href="#/familia?v=reto" ${v === 'reto' ? 'aria-current="page"' : ''}>${kidView ? 'Todos juntos' : 'Reto en equipo'}</a>
      </div>
      ${v === 'ranking' ? `<div class="card" style="margin-top:14px;padding-top:6px;padding-bottom:6px">${ranking}</div>
        <p class="muted" style="margin:10px 0 0;text-align:center">${kidView ? 'Cada quien contra su propia meta' : 'Últimos 7 días · cada quien contra su propia meta'}</p>` : reto}
      <p class="label">Quién respira en casa</p>
      <div class="stack">${cards}</div>
      ${!kidView && me.admin ? `<div class="stack" style="margin-top:12px;gap:10px">
        <a class="btn primary block" href="#/perfiles?nuevo=1">${icon('plus', 18)} Agregar persona</a>
        <a class="btn block" href="#/perfiles">${icon('user', 18)} Editar familia</a></div>` : ''}
      ${!kidView && me.admin && store.profiles().length > 1 ? `<div class="between" style="margin-top:24px"><p class="h3" style="margin:0">Metas y rutinas</p><span class="muted">De cada quien</span></div>
      <div class="stack" style="margin-top:10px">${store.profiles().filter((x) => x.id !== me.id).map((x) => familyCard(store, x)).join('')}</div>` : ''}
      <a class="card row" href="${kidView ? '#/premios' : '#/premiosadmin'}" style="margin-top:14px;color:inherit;text-decoration:none">${icon('gift', 22, 'style="color:var(--arena);flex:none"')}
        <span style="flex:1"><span style="display:block;font-weight:600">${kidView ? 'Mis premios' : 'Premios de la familia'}</span>${!kidView && store.pendingRedemptions().length ? `<span class="muted">${store.pendingRedemptions().length} por aprobar</span>` : ''}</span>${icon('chev', 18, 'style="color:var(--muted)"')}</a>
      ${kidView ? '' : `<div class="tile row" style="margin-top:14px">${icon('users', 20, 'style="color:var(--arena);flex:none"')}<span class="sub" style="margin:0">Pronto: tu maestra de respiración podrá ver el avance y asignar prácticas.</span></div>`}`;
  },
  mount(root, ctx) {
    return ctx.profile.kind === 'adulto' ? manageGoals(root, ctx) : null;
  },
};
