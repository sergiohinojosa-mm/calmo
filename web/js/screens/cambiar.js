// "¿Quién va a respirar?": el PIN protege a los adultos en un teléfono compartido.
// - De adulto a niña: si el adulto no tiene PIN, primero lo crea (para poder volver).
// - De niña a adulto: se pide su PIN; si no tiene, el de cualquier adulto que sí tenga;
//   si ningún adulto tiene PIN, no hay nada que proteger y se pasa directo.
// - De adulto a otro adulto: se pide el PIN de ese adulto si lo tiene.

import { esc, icon, avatar, askPin, toast } from '../ui.js';
import { kindLabel } from './perfil.js';

const isAdult = (p) => p.kind === 'adulto';

// Adultos que ya tienen PIN.
// El perfil de la maestra no es de la familia: no aparece aquí ni cuenta para los PIN.
const adultsWithPin = (store) => store.familyMembers().filter((a) => isAdult(a) && store.hasPin(a.id));

// ¿Qué pide entrar al perfil p estando en cur? 'none' | 'own' (su PIN) | 'any' (el de un adulto) | 'create' (crear el PIN de cur).
function gate(store, cur, p) {
  if (p.id === cur.id) return 'none';
  if (isAdult(p)) {
    if (store.hasPin(p.id)) return 'own';
    if (!isAdult(cur) && adultsWithPin(store).length) return 'any';
    return 'none';
  }
  if (isAdult(cur) && !store.hasPin(cur.id)) return 'create';
  return 'none';
}

// Texto de abajo: dice lo que de verdad va a pasar con este perfil y estos PIN.
function note(store, cur) {
  const all = store.familyMembers();
  const kids = all.filter((p) => !isAdult(p));
  const withPin = adultsWithPin(store);
  if (isAdult(cur)) {
    if (!kids.length) return withPin.some((a) => a.id !== cur.id) ? 'Entrar al perfil de un adulto con PIN pide su PIN.' : '';
    if (!store.hasPin(cur.id)) return 'Antes de entrar al perfil de una niña vas a crear tu PIN. Así solo un adulto puede volver a tu perfil.';
    return 'Entrar al perfil de una niña no pide PIN. Para volver a tu perfil se pide tu PIN.';
  }
  if (!withPin.length) return 'Ningún adulto tiene PIN todavía: cualquiera puede entrar a cualquier perfil. Papá o mamá lo crean en Ajustes.';
  const without = all.filter((p) => isAdult(p) && !store.hasPin(p.id));
  return `Entrar al perfil de otra niña no pide PIN. Volver al de papá o mamá pide su PIN${without.length ? '; si no tiene, sirve el de otro adulto' : ''}.`;
}

export default {
  full: true,
  render(ctx) {
    const { store } = ctx;
    const cur = ctx.profile;
    const text = note(store, cur);
    return `<section style="min-height:100dvh;padding:calc(var(--safe-t) + 16px) 20px calc(var(--safe-b) + 28px)">
      <div class="top">${isAdult(cur) ? `<a class="icon-btn" href="#/inicio" aria-label="Volver">${icon('back', 20)}</a>` : '<span></span>'}<span></span></div>
      <h1 class="h1">¿Quién va a respirar?</h1>
      <p class="sub">Perfiles en este teléfono</p>
      <div class="grid2" style="margin-top:18px" id="grid">
        ${store.familyMembers().map((p) => {
          const g = gate(store, cur, p);
          return `<button class="tile" data-id="${esc(p.id)}" aria-pressed="${p.id === cur.id}" style="text-align:center;padding:18px 8px;color:var(--text);border:1px solid ${p.id === cur.id ? 'var(--sage)' : 'var(--line)'};background:${p.id === cur.id ? 'rgba(156,197,161,0.14)' : 'var(--low)'}">
          <span style="display:flex;justify-content:center">${avatar(p, 72)}</span>
          <span style="display:block;margin-top:10px;font-size:17px;font-weight:600">${esc(p.name)}</span>
          <span class="muted">${esc(kindLabel(p))}${p.id === cur.id ? ' · actual' : ''}</span>
          ${g === 'own' || g === 'any' ? `<span class="muted" style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:4px">${icon('lock', 12)} con PIN</span>` : ''}
        </button>`;
        }).join('')}
      </div>
      ${text ? `<p class="sub" style="display:flex;gap:8px;align-items:flex-start;margin-top:16px">${icon('lock', 16, 'style="flex:none;margin-top:2px"')}<span>${esc(text)}</span></p>` : ''}
    </section>`;
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const enter = (id) => { store.setCurrent(id); go('inicio'); };
    let open = false;

    root.querySelector('#grid').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-id]');
      if (!btn || open) return;
      const p = store.profile(btn.dataset.id);
      const cur = ctx.profile;
      if (!p || p.id !== btn.dataset.id) return;
      if (p.id === cur.id) { go('inicio'); return; }
      const g = gate(store, cur, p);
      open = true;
      try {
        if (g === 'own') {
          if (await askPin({ title: `PIN de ${p.name}`, check: (pin) => store.checkPin(p.id, pin) })) enter(p.id);
        } else if (g === 'any') {
          const names = adultsWithPin(store).map((a) => a.name).join(' o ');
          const ok = await askPin({
            title: 'PIN de papá o mamá',
            sub: `${p.name} todavía no tiene PIN. Sirve el de ${names}.`,
            prompt: 'Escribe el PIN de un adulto',
            check: (pin) => adultsWithPin(store).some((a) => store.checkPin(a.id, pin)),
          });
          if (ok) enter(p.id);
        } else if (g === 'create') {
          const pin = await askPin({
            title: 'Antes de pasarle el teléfono, crea tu PIN para poder volver',
            sub: `Son 4 números. Se pedirán para volver del perfil de ${p.name} al tuyo.`,
            create: true,
            cancel: 'Ahora no',
          });
          if (pin) { store.setPin(cur.id, pin); toast('PIN guardado'); enter(p.id); }
        } else {
          enter(p.id);
        }
      } finally {
        open = false;
      }
    });
  },
};
