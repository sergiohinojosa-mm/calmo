// "¿Quién va a respirar?": entrar a una niña es un toque; volver a un adulto pide su PIN.

import { esc, icon, avatar } from '../ui.js';
import { kindLabel } from './perfil.js';

export default {
  full: true,
  render(ctx) {
    const { store } = ctx;
    const cur = ctx.profile;
    return `<section style="min-height:100dvh;padding:calc(var(--safe-t) + 16px) 20px calc(var(--safe-b) + 28px)">
      <div class="top">${cur.kind === 'adulto' ? `<a class="icon-btn" href="#/inicio" aria-label="Volver">${icon('back', 20)}</a>` : '<span></span>'}<span></span></div>
      <h1 class="h1">¿Quién va a respirar?</h1>
      <p class="sub">Perfiles en este teléfono</p>
      <div class="grid2" style="margin-top:18px" id="grid">
        ${store.profiles().map((p) => `<button class="tile" data-id="${esc(p.id)}" aria-pressed="${p.id === cur.id}" style="text-align:center;padding:18px 8px;color:var(--text);border:1px solid ${p.id === cur.id ? 'var(--sage)' : 'var(--line)'};background:${p.id === cur.id ? 'rgba(156,197,161,0.14)' : 'var(--low)'}">
          <span style="display:flex;justify-content:center">${avatar(p, 72)}</span>
          <span style="display:block;margin-top:10px;font-size:17px;font-weight:600">${esc(p.name)}</span>
          <span class="muted">${esc(kindLabel(p))}${p.id === cur.id ? ' · actual' : ''}</span>
          ${p.kind === 'adulto' && store.hasPin(p.id) && p.id !== cur.id ? `<span class="muted" style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:4px">${icon('lock', 12)} con PIN</span>` : ''}
        </button>`).join('')}
      </div>
      <p class="sub" style="display:flex;gap:8px;align-items:center;margin-top:16px">${icon('lock', 16)} Entrar al perfil de una niña no pide PIN. Volver al de un adulto, sí.</p>
      <div id="pin"></div>
    </section>`;
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const pinBox = root.querySelector('#pin');
    const enter = (id) => { store.setCurrent(id); go('inicio'); };

    const askPin = (p) => {
      let digits = '';
      let error = '';
      const draw = () => {
        pinBox.innerHTML = `<div class="card" style="margin-top:18px">
          <p class="h3" style="text-align:center">PIN de ${esc(p.name)}</p>
          <div class="row" style="justify-content:center;gap:14px;margin:14px 0" aria-live="polite" aria-label="${digits.length} de 4 números">
            ${[0, 1, 2, 3].map((i) => `<span style="width:16px;height:16px;border-radius:50%;${i < digits.length ? 'background:var(--sage)' : 'border:2px solid var(--line2)'}"></span>`).join('')}</div>
          ${error ? `<p role="alert" style="text-align:center;color:var(--brasa);font-size:14px;margin:0 0 12px">${esc(error)}</p>` : ''}
          <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}<span aria-hidden="true"></span><button data-k="0">0</button><button data-k="del" aria-label="Borrar">⌫</button></div>
        </div>`;
        pinBox.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
          if (b.dataset.k === 'del') digits = digits.slice(0, -1);
          else if (digits.length < 4) digits += b.dataset.k;
          error = '';
          if (digits.length === 4) {
            if (store.checkPin(p.id, digits)) { enter(p.id); return; }
            digits = '';
            error = 'Ese PIN no coincide. Intenta otra vez.';
          }
          draw();
        }));
        pinBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };
      draw();
    };

    root.querySelector('#grid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-id]');
      if (!btn) return;
      const p = store.profile(btn.dataset.id);
      const cur = ctx.profile;
      if (p.id === cur.id) { go('inicio'); return; }
      if (p.kind !== 'adulto' || !store.hasPin(p.id)) { enter(p.id); return; }
      askPin(p);
    });
  },
};
