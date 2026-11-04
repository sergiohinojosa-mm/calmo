// Premios de la familia para papá y mamá: aprobar lo que piden las niñas y
// cambiar la lista. Aprobar pide el PIN del adulto (o que lo cree si no tiene),
// por si el teléfono se quedó abierto en su perfil.

import { esc, icon, avatar, toast, confetti, askConfirm, askPin, plural, MESES } from '../ui.js';

const shortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

// Premio que se está editando: su id, 'nuevo' o null.
let editing = null;

function form(r = { name: '', cost: 100 }) {
  return `<form class="tile stack" data-form="${esc(r.id || 'nuevo')}" style="gap:10px" novalidate>
    <label class="stack" style="gap:6px"><span class="muted">Premio</span>
      <input class="field" name="name" maxlength="60" autocomplete="off" value="${esc(r.name)}" placeholder="Ej. Ir al parque"></label>
    <label class="stack" style="gap:6px"><span class="muted">Hojas que cuesta</span>
      <input class="field" name="cost" type="number" inputmode="numeric" min="5" max="5000" value="${r.cost}"></label>
    <div class="row" style="justify-content:flex-end">
      <button type="button" class="btn small" data-cancel>Cancelar</button>
      <button type="submit" class="btn small primary">Guardar</button>
    </div>
  </form>`;
}

export default {
  tab: 'familia',
  render(ctx) {
    const { store } = ctx;
    const me = ctx.profile;
    if (me.kind !== 'adulto') {
      return `<div class="top"><a class="icon-btn" href="#/premios" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Premios</h1></div>
        <div class="tile"><p class="sub" style="margin:0">Esta parte es para papá y mamá.</p><a class="btn primary block" href="#/premios" style="margin-top:12px">Ver mis premios</a></div>`;
    }
    const people = Object.fromEntries(store.profiles().map((p) => [p.id, p]));
    const kids = store.profiles().filter((p) => p.kind !== 'adulto');
    const pending = store.pendingRedemptions();
    const decided = store.redemptions().filter((r) => r.status !== 'pendiente').slice(0, 10);

    const approve = pending.length ? pending.map((r) => {
      const kid = people[r.profile];
      return `<div class="tile stack" style="gap:12px">
        <div class="row" style="gap:12px">${kid ? avatar(kid, 44) : ''}
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(kid ? kid.name : 'Alguien')} quiere: ${esc(r.name)}</span>
          <span class="muted">${r.cost} hojas · lo pidió el ${shortDate(r.requestedAt)}</span></span></div>
        <div class="row" style="justify-content:flex-end">
          <button class="btn small" data-later="${esc(r.id)}">Ahora no</button>
          <button class="btn small primary" data-ok="${esc(r.id)}">${icon('check', 16)} Aprobar</button>
        </div></div>`;
    }).join('') : '<div class="tile"><p class="sub" style="margin:0">No hay premios por aprobar.</p></div>';

    const balances = kids.length ? `<p class="label">Hojas para premios</p>
      <div class="stack">${kids.map((k) => `<div class="tile row" style="gap:12px">${avatar(k, 40)}
        <span style="flex:1;font-weight:600">${esc(k.name)}</span>
        <span class="row" style="gap:4px;color:var(--hoja);font-weight:600">${icon('leaf', 16)} ${store.rewardBalance(k.id)}</span></div>`).join('')}</div>` : '';

    const list = store.rewards({ all: true }).map((r) => (editing === r.id ? form(r) : `<div class="tile row" style="gap:10px;${r.active ? '' : 'opacity:.55'}">
        <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(r.name)}</span>
        <span class="muted">${r.cost} hojas${r.active ? '' : ' · pausado'}</span></span>
        <button class="btn small" data-toggle="${esc(r.id)}">${r.active ? 'Pausar' : 'Activar'}</button>
        <button class="icon-btn" data-edit="${esc(r.id)}" aria-label="Editar ${esc(r.name)}">${icon('edit', 18)}</button>
      </div>`)).join('');

    const hist = decided.length ? `<p class="label">Historial</p>
      <div class="stack">${decided.map((r) => `<div class="tile row">
        ${icon(r.status === 'aprobado' ? 'check' : 'x', 18, `style="color:${r.status === 'aprobado' ? 'var(--sage)' : 'var(--muted)'};flex:none"`)}
        <span style="flex:1"><span style="display:block">${esc(people[r.profile]?.name || 'Alguien')} · ${esc(r.name)}</span>
        <span class="muted">${r.status === 'aprobado' ? `Aprobado · ${r.cost} hojas` : 'Ahora no · las hojas regresaron'} · ${shortDate(r.decidedAt)}</span></span></div>`).join('')}</div>` : '';

    return `<div class="top"><a class="icon-btn" href="#/familia" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Premios de la familia</h1></div>
      <p class="label" style="margin-top:4px">Por aprobar${pending.length ? ` · ${pending.length}` : ''}</p>
      <div class="stack">${approve}</div>
      ${balances}
      <p class="label">Lista de premios</p>
      <div class="stack">${list}${editing === 'nuevo' ? form() : `<button class="btn block" data-new>${icon('plus', 18)} Agregar premio</button>`}</div>
      ${hist}
      <p class="muted" style="margin-top:18px;text-align:center">Pedir un premio aparta las hojas. «Ahora no» las regresa. Cambiar hojas nunca baja el nivel.</p>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const me = ctx.profile;
    if (me.kind !== 'adulto') return null;
    // Para enfocar el nombre hay que esperar a que la pantalla se vuelva a dibujar.
    const focusForm = async (id) => {
      await rerender();
      root.querySelector(`[data-form="${CSS.escape(id)}"] [name="name"]`)?.focus();
    };
    let asking = false;
    const approve = async (id) => {
      const r = store.pendingRedemptions().find((x) => x.id === id);
      if (!r) { rerender(); return; }
      const kid = store.profile(r.profile);
      const who = kid && kid.id === r.profile ? kid.name : 'Alguien';
      if (store.hasPin(me.id)) {
        const ok = await askPin({ title: `Aprobar: ${r.name}`, sub: `${who} lo pidió. Escribe el PIN de ${me.name}.`, check: (pin) => store.checkPin(me.id, pin) });
        if (!ok) return;
      } else {
        const pin = await askPin({ title: 'Crea tu PIN para aprobar premios', sub: 'Así solo papá o mamá pueden aprobar. Lo escribirás dos veces.', create: true });
        if (!pin) return;
        store.setPin(me.id, pin);
      }
      // Pudo decidirse en otro teléfono mientras se escribía el PIN.
      if (!store.pendingRedemptions().some((x) => x.id === id)) { toast('Ese premio ya se había decidido'); rerender(); return; }
      store.decideRedemption(id, true);
      confetti();
      toast(`Aprobado: ${r.name}. ¡A disfrutarlo!`);
      rerender();
    };
    const onClick = async (e) => {
      const t = (attr) => e.target.closest(`[data-${attr}]`);
      if (t('ok')) {
        if (asking) return;
        asking = true;
        try { await approve(t('ok').dataset.ok); } finally { asking = false; }
      } else if (t('later')) {
        const ok = await askConfirm('¿Lo dejamos para después? Sus hojas regresan.', { ok: 'Sí, ahora no', cancel: 'Cancelar' });
        if (ok) { store.decideRedemption(t('later').dataset.later, false); rerender(); }
      } else if (t('toggle')) {
        const r = store.rewards({ all: true }).find((x) => x.id === t('toggle').dataset.toggle);
        if (r) { store.saveReward({ ...r, active: !r.active }); rerender(); }
      } else if (t('edit')) {
        editing = t('edit').dataset.edit;
        focusForm(editing);
      } else if (t('new')) {
        editing = 'nuevo';
        focusForm('nuevo');
      } else if (t('cancel')) {
        editing = null; rerender();
      }
    };
    const onSubmit = (e) => {
      const f = e.target.closest('[data-form]');
      if (!f) return;
      e.preventDefault();
      const id = f.dataset.form === 'nuevo' ? null : f.dataset.form;
      const prev = id && store.rewards({ all: true }).find((x) => x.id === id);
      const saved = store.saveReward({ id, name: f.name.value, cost: f.cost.value, active: prev ? prev.active : true });
      if (!saved) { toast('Escribe el nombre del premio.'); return; }
      editing = null;
      toast(id ? 'Premio guardado' : `Premio agregado · ${plural(Math.max(5, Math.round(Number(f.cost.value) || 0)), 'hoja', 'hojas')}`);
      rerender();
    };
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    return () => { root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit); };
  },
};
