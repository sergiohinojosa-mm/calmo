import { esc, icon, bar, avatar, DIAS_C, dayKey, addDays, askConfirm } from '../ui.js';
import { byId, nameFor } from '../catalog.js';

export const boltLevel = (s) => (s < 10 ? 'Inicio' : s < 20 ? 'Base' : s < 30 ? 'Intermedio' : s < 40 ? 'Avanzado' : 'Meta');

export function sparkline(values, color = '#9CC5A1', w = 120, h = 36) {
  if (values.length < 2) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 3, h - 3 - ((v - min) / span) * (h - 6)]);
  const [lx, ly] = pts.at(-1);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${color}"/></svg>`;
}

export function kindLabel(p) {
  if (p.kind === 'adulto') return p.admin ? 'Adulto · Administrador' : 'Adulto';
  return `${p.kind === 'junior' ? 'Junior' : 'Peque'}${p.age ? ` · ${p.age} años` : ''}`;
}

export function freqLabel(r) {
  if (r.freq === 'daily') return 'Todos los días';
  if (r.freq === 'weekdays') return 'Entre semana';
  if (r.freq === 'once') return 'Una vez';
  return (r.days || []).map((d) => DIAS_C[d]).join(' · ') || 'Sin días';
}

const GOAL_DEFS = [
  { key: 'bolt', label: 'BOLT', kid: 'Reto del aire', prefix: 'Última', unit: ' s', step: 5, min: 10, max: 60 },
  { key: 'steps', label: 'Pasos sin respirar', kid: 'Mi récord de pasos', prefix: 'Récord', unit: ' pasos', step: 10, min: 20, max: 150 },
  { key: 'weekly', label: 'Minutos por semana', kid: 'Minutos por semana', prefix: 'Últimos 7 días', unit: ' min', step: 10, min: 10, max: 420 },
];

// Botones − meta + de un perfil (el propio o, para el administrador, el de alguien más).
function stepper(d, who, target, label) {
  return `<div class="row" style="gap:6px;flex:none">
    <button class="icon-btn" style="background:var(--low);border:1px solid var(--line2)" data-goal="${d.key}" data-who="${esc(who)}" data-delta="-${d.step}" aria-label="Bajar meta de ${esc(label)}">${icon('minus', 18)}</button>
    <span class="num" style="min-width:64px;text-align:center;font-size:22px">${target}${d.unit}</span>
    <button class="icon-btn" style="background:var(--low);border:1px solid var(--line2)" data-goal="${d.key}" data-who="${esc(who)}" data-delta="${d.step}" aria-label="Subir meta de ${esc(label)}">${icon('plus', 18)}</button>
  </div>`;
}

// Fila de una rutina. Los niños la ven sin interruptor ni botón de borrar.
function routineRow(r, owner, manage) {
  const kid = owner.kind !== 'adulto';
  const ex = r.exerciseId ? byId(r.exerciseId) : null;
  const what = r.kind === 'bolt' ? (kid ? 'Reto del aire' : 'Medir BOLT') : `${ex ? nameFor(ex, owner.kind) : 'Sesión'} · ${r.minutes} min`;
  const info = `<span style="width:40px;height:40px;flex:none;border-radius:14px;background:rgba(156,197,161,0.12);color:var(--hoja);display:flex;align-items:center;justify-content:center">${icon(r.kind === 'bolt' ? 'timer' : 'repeat', 18)}</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:600">${esc(r.name)} · ${esc(r.time)}</span>
      <span class="muted">${esc(freqLabel(r))} · ${esc(what)}${r.active === false ? ' · En pausa' : ''}</span></span>`;
  if (!manage) return `<div class="tile row" style="padding:12px 14px">${info}</div>`;
  return `<div class="tile row" style="padding:12px 14px">
    <a href="#/planear?editar=${encodeURIComponent(r.id)}&de=perfil" class="row" style="flex:1;min-width:0;color:inherit;text-decoration:none" aria-label="Editar rutina ${esc(r.name)} ${esc(r.time)}">${info}</a>
    <button class="switch" role="switch" aria-checked="${r.active !== false}" aria-label="Rutina ${esc(r.name)} ${esc(r.time)}" data-rt-toggle="${esc(r.id)}" data-who="${esc(owner.id)}"><span></span></button>
    <button class="icon-btn" style="width:40px;height:40px;background:transparent;color:var(--muted)" data-rt-del="${esc(r.id)}" data-who="${esc(owner.id)}" aria-label="Borrar rutina ${esc(r.name)}">${icon('trash', 18)}</button>
  </div>`;
}

// Para el administrador: metas y rutinas de cada persona de la familia.
function familyCard(store, x) {
  const g = store.goals(x.id);
  const kid = x.kind !== 'adulto';
  const goals = GOAL_DEFS.map((d) => {
    const label = kid ? d.kid : d.label;
    return `<div class="between" style="margin-top:10px;gap:10px"><span style="font-size:14px;min-width:0">${esc(label)}</span>${stepper(d, x.id, g[d.key], `${label} de ${x.name}`)}</div>`;
  }).join('');
  const list = store.routines(x.id);
  return `<div class="card">
    <div class="row" style="gap:12px">${avatar(x, 44)}
      <div style="flex:1;min-width:0"><p class="h3" style="margin:0">${esc(x.name)}</p><p class="muted" style="margin:2px 0 0">${esc(kindLabel(x))}</p></div>
      <a href="#/calendario?p=${encodeURIComponent(x.id)}" style="font-size:14px;font-weight:500;text-decoration:none;padding:12px 0">Calendario</a></div>
    ${goals}
    <div class="between" style="margin-top:14px"><span class="muted">Rutinas</span>
      <a href="#/planear?p=${encodeURIComponent(x.id)}&de=perfil" style="font-size:14px;font-weight:500;text-decoration:none;padding:12px 0">Agregar rutina</a></div>
    <div class="stack" style="gap:8px">${list.length ? list.map((r) => routineRow(r, x, true)).join('') : '<p class="muted" style="margin:0">Sin rutinas todavía.</p>'}</div>
  </div>`;
}

function row(href, ic, label) {
  return `<a class="list-row" href="${href}">${icon(ic, 20, 'style="color:var(--text2);flex:none"')}<span style="flex:1;font-size:15px">${esc(label)}</span>${icon('chev', 18, 'style="color:var(--muted)"')}</a>`;
}

function peque(ctx) {
  const { store } = ctx;
  const p = ctx.profile;
  const monday = addDays(new Date(), -((new Date().getDay() + 6) % 7));
  const days = store.practicedDays(p.id);
  const stars = Array.from({ length: 7 }, (_, i) => days.has(dayKey(addDays(monday, i)))).filter(Boolean).length;
  return `<div class="stack" style="padding-top:12px;text-align:center;align-items:center">
    ${avatar(p, 96)}
    <h1 class="h1" style="font-size:36px">${esc(p.name)}</h1>
    <div class="row" style="justify-content:center">${icon('star', 34, 'style="color:var(--arena)"')}<span class="num" style="font-size:40px">${stars}</span></div>
    <p class="sub" style="font-size:18px;margin:0">estrellas esta semana</p>
    <a class="btn primary block" href="#/inicio" style="margin-top:24px;min-height:64px;font-size:20px">${icon('home', 22)} Volver a inicio</a>
    <a class="btn block" href="#/cambiar" style="min-height:60px;font-size:18px">${icon('lock', 20)} Volver a papá o mamá</a>
  </div>`;
}

export default {
  tab: 'perfil',
  render(ctx) {
    const { store } = ctx;
    const p = ctx.profile;
    if (p.kind === 'peque') return peque(ctx);
    const kid = p.kind !== 'adulto';
    const g = store.goals(p.id);
    const lb = store.lastBolt(p.id);
    const best = store.bestSteps(p.id);
    const bolts = store.bolt(p.id).slice(-8).map((m) => m.seconds);
    const current = { bolt: lb ? lb.seconds : 0, steps: best, weekly: Math.round(store.last7(p.id)) };
    const routines = store.routines(p.id);
    const lv = store.level(p.id);
    const family = p.kind === 'adulto' && p.admin ? store.profiles().filter((x) => x.id !== p.id) : [];

    const goals = GOAL_DEFS.map((d) => {
      const target = g[d.key];
      const now = current[d.key];
      const left = target - now;
      return `<div class="card" style="padding:14px 16px">
        <div class="between">
          <div style="min-width:0"><p class="h3" style="margin:0">${esc(kid ? d.kid : d.label)}</p>
            <p class="muted" style="margin:2px 0 0">${d.prefix}: ${now ? `${now}${d.unit}` : 'sin medir'} · ${left > 0 ? `te faltan ${left}${d.unit}` : '¡meta lograda!'}</p></div>
          ${kid
            ? `<span class="num" style="font-size:24px">${target}${d.unit}</span>`
            : stepper(d, p.id, target, d.label)}
        </div>
        <div style="margin-top:12px">${bar(target ? (now / target) * 100 : 0, d.key === 'bolt' ? 'var(--sage)' : d.key === 'steps' ? 'var(--hoja)' : 'var(--arena)')}</div>
      </div>`;
    }).join('');

    const routineRows = routines.length ? routines.map((r) => routineRow(r, p, !kid)).join('') : `<p class="sub">Todavía no tienes rutinas.</p>`;

    return `<div class="row" style="gap:16px;margin-bottom:6px">
        ${avatar(p, 72)}
        <div style="flex:1;min-width:0"><h1 class="h1">${esc(p.name)}</h1><p class="sub" style="margin-top:2px">${esc(kindLabel(p))}</p></div>
      </div>
      <a href="#/cambiar" class="btn small" style="margin-top:8px">${icon('users', 18)} Cambiar de perfil</a>

      <p class="label">${kid ? 'Mis retos' : 'Medir'}</p>
      <div class="stack">
        <div class="card">
          <div class="between" style="align-items:flex-start">
            <div><p class="muted" style="margin:0;font-size:13px;color:var(--text2)">${kid ? 'Reto del aire' : 'BOLT score'}</p>
              <p class="num" style="margin:2px 0 0;font-size:44px;line-height:1.05">${lb ? lb.seconds : '—'} <span style="font-family:var(--sans);font-size:15px;color:var(--text2)">s</span></p></div>
            ${lb ? `<span class="chip sage">${kid ? `Meta ${g.bolt} s` : `Nivel ${boltLevel(lb.seconds).toLowerCase()}`}</span>` : ''}
          </div>
          ${sparkline(bolts) ? `<div style="margin-top:8px">${sparkline(bolts, '#9CC5A1', 300, 44).replace('width="300"', 'width="100%"')}</div>` : ''}
          <div style="margin-top:10px">${bar(lb ? (lb.seconds / g.bolt) * 100 : 0)}</div>
          <p class="muted" style="margin:6px 0 14px">${kid ? 'Los segundos que aguantas tranquila' : `Meta ${g.bolt} s${lb ? ` · te faltan ${Math.max(0, g.bolt - lb.seconds)} s` : ' · mídelo al despertar'}`}</p>
          <a class="btn primary block" href="#/bolt">${icon('timer', 18)} ${kid ? 'Hacer el reto' : 'Medir BOLT'}</a>
        </div>
        <div class="card">
          <p class="muted" style="margin:0;font-size:13px;color:var(--text2)">${kid ? 'Mi récord de pasos' : 'Pasos sin respirar'}</p>
          <div class="row" style="align-items:baseline;gap:10px"><p class="num" style="margin:2px 0 0;font-size:44px;line-height:1.05">${best || '—'}</p><span class="muted">${best ? 'tu mejor marca' : 'sin medir todavía'}</span></div>
          <div style="margin-top:10px">${bar(best ? (best / g.steps) * 100 : 0, 'var(--hoja)')}</div>
          <p class="muted" style="margin:6px 0 14px">Meta ${g.steps} pasos${best ? ` · te faltan ${Math.max(0, g.steps - best)}` : ''}</p>
          <div class="grid2">
            <a class="btn small" href="#/pasos" style="border-color:rgba(156,197,161,0.5);color:var(--hoja)">${kid ? 'Mi récord' : 'Prueba de máximo'}</a>
            <a class="btn small" href="#/serie" style="border-color:rgba(156,197,161,0.5);color:var(--hoja)">${kid ? 'Vueltas caminando' : 'Serie caminando'}</a>
          </div>
        </div>
      </div>

      <a class="card row" href="#/logros" style="margin-top:12px;color:inherit;text-decoration:none">
        <span style="width:44px;height:44px;flex:none;border-radius:50%;background:rgba(185,222,195,0.14);color:var(--hoja);display:flex;align-items:center;justify-content:center">${icon('leaf', 22)}</span>
        <span style="flex:1"><span style="display:block;font-size:15px;font-weight:600">Mis logros</span><span class="muted">Nivel ${esc(lv.name)} · ${lv.points} ${lv.points === 1 ? "hoja" : "hojas"}</span></span>
        ${icon('chev', 18, 'style="color:var(--muted)"')}
      </a>

      <div class="between" style="margin-top:22px"><p class="h3" style="margin:0">Mis metas</p>${kid ? '<span class="muted">Las ajustan papá o mamá</span>' : ''}</div>
      <div class="stack" style="margin-top:10px">${goals}</div>

      <div class="between" style="margin-top:22px"><p class="h3" style="margin:0">Mis rutinas</p>
        ${kid ? '' : '<a href="#/planear" style="font-size:14px;font-weight:500;text-decoration:none;padding:12px 0">Agregar rutina</a>'}</div>
      <div class="stack" style="margin-top:6px">${routineRows}</div>
      ${family.length ? `<div class="between" style="margin-top:22px"><p class="h3" style="margin:0">Familia</p><span class="muted">Metas y rutinas de cada quien</span></div>
      <div class="stack" style="margin-top:10px">${family.map((x) => familyCard(store, x)).join('')}</div>` : ''}

      <p class="h3" style="margin:22px 0 4px">Más</p>
      <div>
        ${row('#/logros', 'star', 'Mis logros')}
        ${row('#/consejos', 'sun', 'Consejos de respiración')}
        ${row('#/ajustes', 'gear', 'Ajustes y sonido')}
        ${row('#/cambiar', 'users', 'Cambiar de perfil')}
      </div>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const p = ctx.profile;
    const onClick = (e) => {
      // Cada botón dice de quién es (data-who); los niños no cambian metas ni rutinas.
      const whoOf = (el) => {
        const who = el.dataset.who || p.id;
        return p.kind === 'adulto' && store.canManage(p.id, who) ? who : null;
      };
      const goal = e.target.closest('[data-goal]');
      if (goal) {
        const who = whoOf(goal);
        if (!who) return;
        const d = GOAL_DEFS.find((x) => x.key === goal.dataset.goal);
        const v = store.goals(who)[d.key] + Number(goal.dataset.delta);
        store.setGoal(who, d.key, Math.min(d.max, Math.max(d.min, v)));
        rerender();
        return;
      }
      const tog = e.target.closest('[data-rt-toggle]');
      if (tog) {
        const who = whoOf(tog);
        const r = who && store.routines(who).find((x) => x.id === tog.dataset.rtToggle);
        if (r) store.updateRoutine(r.id, { active: r.active === false });
        rerender();
        return;
      }
      const del = e.target.closest('[data-rt-del]');
      if (del) {
        const who = whoOf(del);
        const r = who && store.routines(who).find((x) => x.id === del.dataset.rtDel);
        if (r) askConfirm(`¿Borrar la rutina «${r.name} · ${r.time}»? Los días pasados conservan lo que se hizo.`, { ok: 'Borrar' }).then((ok) => {
          if (ok) { store.removeRoutine(r.id); rerender(); }
        });
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
