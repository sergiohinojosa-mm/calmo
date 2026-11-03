// Premios de la familia para las niñas: cambian hojas por algo que les guste.
// Pedir un premio aparta las hojas; papá o mamá lo aprueban desde su perfil.

import { esc, icon, bar, toast, confetti, askConfirm, plural, MESES } from '../ui.js';

const shortDate = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

export default {
  tab: 'logros',
  render(ctx) {
    const { store } = ctx;
    const p = ctx.profile;
    if (p.kind === 'adulto') {
      return `<div class="top"><a class="icon-btn" href="#/progreso" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Premios</h1></div>
        <div class="tile"><p class="sub" style="margin:0">Los premios son para las niñas. Desde aquí los apruebas y los cambias.</p>
        <a class="btn primary block" href="#/premiosadmin" style="margin-top:12px">${icon('gift', 18)} Premios de la familia</a></div>`;
    }
    const peque = p.kind === 'peque';
    const balance = store.rewardBalance(p.id);
    const mine = store.redemptions(p.id);
    const waiting = mine.filter((r) => r.status === 'pendiente');
    const history = mine.filter((r) => r.status !== 'pendiente').slice(0, 8);

    const list = store.rewards().map((r) => {
      const asked = waiting.some((w) => w.rewardId === r.id);
      const left = r.cost - balance;
      const action = asked
        ? `<span class="chip arena">${icon('timer', 14)} Ya lo pediste</span>`
        : left <= 0
          ? `<button class="btn primary small" data-want="${esc(r.id)}" style="min-height:44px">${icon('gift', 16)} ¡Lo quiero!</button>`
          : `<span class="muted">Te faltan ${plural(left, 'hoja', 'hojas')}</span>`;
      return `<div class="tile" style="padding:14px 16px">
        <div class="between" style="gap:10px;align-items:flex-start">
          <span style="flex:1;min-width:0"><span style="display:block;font-size:${peque ? 18 : 16}px;font-weight:600;line-height:1.35">${esc(r.name)}</span>
          <span class="row" style="gap:4px;margin-top:4px;color:var(--hoja);font-size:14px">${icon('leaf', 14)} ${r.cost} hojas</span></span>
          ${action}
        </div>
        ${!asked && left > 0 ? `<div style="margin-top:10px">${bar((balance / r.cost) * 100, 'var(--arena)')}</div>` : ''}
      </div>`;
    }).join('');

    const pend = waiting.length ? `<p class="label">Esperando a papá o mamá</p>
      <div class="stack">${waiting.map((r) => `<div class="tile row">${icon('gift', 20, 'style="color:var(--arena);flex:none"')}
        <span style="flex:1"><span style="display:block;font-weight:600">${esc(r.name)}</span><span class="muted">${r.cost} hojas apartadas · ${shortDate(r.requestedAt)}</span></span></div>`).join('')}</div>` : '';

    const hist = history.length ? `<p class="label">Tus premios</p>
      <div class="stack">${history.map((r) => `<div class="tile row">
        ${icon(r.status === 'aprobado' ? 'star' : 'leaf', 20, `style="color:${r.status === 'aprobado' ? 'var(--arena)' : 'var(--muted)'};flex:none"`)}
        <span style="flex:1"><span style="display:block;font-weight:600">${esc(r.name)}</span>
        <span class="muted">${r.status === 'aprobado' ? `¡Lo ganaste! · ${shortDate(r.decidedAt)}` : 'Ahora no · tus hojas regresaron'}</span></span></div>`).join('')}</div>` : '';

    return `<div class="top"><a class="icon-btn" href="${peque ? '#/inicio' : '#/logros'}" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Mis premios</h1></div>
      <div class="card" style="text-align:center">
        <p class="muted" style="margin:0">Hojas para premios</p>
        <p class="num row" style="justify-content:center;gap:8px;margin:6px 0 0;font-size:44px;color:var(--hoja)">${icon('leaf', 30)} ${balance}</p>
        <p class="sub" style="margin:8px 0 0">Usar tus hojas no baja tu nivel.</p>
      </div>
      ${pend}
      <p class="label">Elige un premio</p>
      <div class="stack">${list || '<div class="tile"><p class="sub" style="margin:0">Todavía no hay premios. Pídele a papá o mamá que agreguen uno.</p></div>'}</div>
      ${hist}
      <p class="muted" style="margin-top:18px;text-align:center">Ganas hojas cada vez que respiras.</p>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const onClick = async (e) => {
      const b = e.target.closest('[data-want]');
      if (!b) return;
      const r = store.rewards().find((x) => x.id === b.dataset.want);
      if (!r) return;
      const ok = await askConfirm(`¿Cambias ${r.cost} hojas por «${r.name}»? Papá o mamá lo van a ver.`, { ok: 'Sí, lo quiero', cancel: 'Todavía no' });
      if (!ok) return;
      const res = store.requestReward(r.id);
      if (!res.ok) { toast(res.error); return; }
      confetti();
      toast('¡Listo! Papá o mamá lo van a ver.');
      rerender();
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
