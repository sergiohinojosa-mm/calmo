// Prueba de pasos sin respirar: cronómetro a pantalla completa y conteo con botones grandes.

import { esc, icon, clock, bar, confetti, plural } from '../ui.js';

const STEPS = [
  ['nose', 'Exhala normal por la nariz.'],
  ['lock', 'Tápate la nariz.'],
  ['steps', 'Camina contando tus pasos. Detente con falta de aire moderada.'],
];

const POINTS = 3;

export default {
  full: true,
  render() {
    return '<section class="session" id="pasos" style="align-items:stretch"></section>';
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const p = ctx.profile;
    const kid = p.kind !== 'adulto';
    const g = store.goals(p.id);
    const best = store.bestSteps(p.id);
    const box = root.querySelector('#pasos');
    const st = { phase: 'intro', t0: 0, secs: 0, steps: best || 20, result: null, pts: 0 };
    let timer = 0;
    const title = kid ? 'Mi récord de pasos' : 'Pasos sin respirar';
    const close = (pe = true) => `<a href="#/perfil" class="icon-btn${pe ? ' pe' : ''}" aria-label="Cerrar" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</a>`;
    const header = (pe) => `<div class="between">${close(pe)}<p style="margin:0;font-size:14px;font-weight:500">${esc(title)}</p><span style="width:44px"></span></div>`;

    function draw() {
      if (st.phase === 'intro') {
        box.innerHTML = `<button class="tapzone" id="tap" aria-label="Empezar el cronómetro"></button>
          <div class="tap-ui stack" style="flex:1">
            ${header(true)}
            <h1 class="h1" style="margin-top:18px">${kid ? '¿Cuántos pasos das sin respirar?' : 'Prueba de máximo'}</h1>
            <div class="stack" style="margin-top:10px">${STEPS.map(([ic, txt], i) => `<div class="tile row">
              <span style="width:40px;height:40px;flex:none;border-radius:50%;background:rgba(156,197,161,0.12);color:var(--hoja);display:flex;align-items:center;justify-content:center">${icon(ic, 20)}</span>
              <span style="font-size:15px">${i + 1}. ${esc(kid && i === 2 ? 'Camina y cuenta. Para cuando quieras respirar.' : txt)}</span></div>`).join('')}</div>
            <p class="sub">Al terminar, respira calmado por la nariz.</p>
            <p class="serif" style="margin-top:auto;text-align:center;font-size:22px;padding:24px 0">Toca en cualquier parte para empezar</p>
          </div>`;
        box.querySelector('#tap').addEventListener('click', start);
      } else if (st.phase === 'running') {
        box.innerHTML = `<button class="tapzone" id="tap" aria-label="Detener el cronómetro"></button>
          <div class="tap-ui stack" style="flex:1;align-items:center;justify-content:center;text-align:center">
            <p class="num" id="secs" style="margin:0;font-size:96px;line-height:1">0:00</p>
            <p class="serif" style="font-size:22px;margin-top:24px">Camina y cuenta tus pasos</p>
            <p class="sub">Toca la pantalla cuando respires.</p>
          </div>`;
        box.querySelector('#tap').addEventListener('click', stop);
      } else if (st.phase === 'count') {
        const pct = (st.steps / g.steps) * 100;
        box.innerHTML = `<div class="stack" style="flex:1">
          ${header(false)}
          <div style="text-align:center;margin-top:8px"><span class="chip">${icon('timer', 14)} Aguantaste ${clock(st.secs)}</span></div>
          <p class="sub" style="text-align:center;margin-top:18px">¿Cuántos pasos diste?</p>
          <input id="num" class="num" type="number" inputmode="numeric" min="0" max="400" value="${st.steps}" aria-label="Pasos"
            style="width:100%;text-align:center;font-size:88px;line-height:1;background:transparent;border:none;color:var(--text)">
          <div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
            ${[-5, -1, 1, 5].map((d) => `<button class="btn" style="min-height:60px;font-size:20px" data-d="${d}" aria-label="${d > 0 ? 'Sumar' : 'Restar'} ${Math.abs(d)}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`).join('')}
          </div>
          <div class="tile" style="margin-top:6px"><div class="between"><span class="muted" style="font-size:13px">Meta ${g.steps} pasos${best ? ` · tu récord ${best}` : ''}</span><span style="font-size:13px">${st.steps >= g.steps ? '¡Meta lograda!' : `Te faltan ${g.steps - st.steps}`}</span></div><div style="margin-top:10px">${bar(pct, 'var(--hoja)')}</div></div>
          <div class="stack" style="margin-top:auto">
            <button class="btn primary block" id="save">Guardar</button>
            <button class="btn block" id="again">Repetir prueba</button>
          </div>
        </div>`;
        box.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { st.steps = Math.max(0, st.steps + Number(b.dataset.d)); draw(); }));
        box.querySelector('#num').addEventListener('change', (e) => { st.steps = Math.max(0, Math.round(Number(e.target.value) || 0)); draw(); });
        box.querySelector('#again').addEventListener('click', () => { st.phase = 'intro'; draw(); });
        box.querySelector('#save').addEventListener('click', save);
      } else {
        const r = st.result;
        box.innerHTML = `<div class="stack" style="flex:1;align-items:center;justify-content:center;text-align:center">
          <span style="width:120px;height:120px;border-radius:50%;background:${r.record ? 'rgba(233,178,125,0.16)' : 'rgba(156,197,161,0.14)'};color:${r.record ? 'var(--brasa)' : 'var(--hoja)'};display:flex;align-items:center;justify-content:center" class="pop">${icon(r.record ? 'star' : 'check', 56)}</span>
          <h1 class="h1" style="margin-top:12px">${r.record ? '¡Nuevo récord!' : '¡Muy bien!'}</h1>
          <p class="sub" style="font-size:18px">${st.steps} pasos${r.record && r.best ? ` · antes ${r.best}` : ''}</p>
          ${st.pts ? `<span class="chip sage">${icon('leaf', 14)} +${plural(st.pts, 'hoja', 'hojas')}</span>` : ''}
          ${r.newBadges.length ? `<span class="chip arena">${icon('star', 14)} Nueva insignia: ${esc(r.newBadges[0].name)}</span>` : ''}
          <a class="btn primary block" href="#/perfil" style="margin-top:28px">Listo</a>
        </div>`;
      }
    }

    function start() {
      st.phase = 'running';
      st.t0 = performance.now();
      draw();
      const secs = box.querySelector('#secs');
      timer = setInterval(() => { secs.textContent = clock((performance.now() - st.t0) / 1000); }, 200);
    }

    function stop() {
      clearInterval(timer);
      st.secs = Math.round((performance.now() - st.t0) / 1000);
      st.phase = 'count';
      draw();
    }

    function save() {
      st.result = store.addSteps({ steps: st.steps, seconds: st.secs, type: 'max' });
      st.pts = typeof store.awardPoints === 'function' ? store.awardPoints(p.id, POINTS, 'pasos') : 0;
      st.phase = 'done';
      draw();
      if (st.result.record || kid) confetti();
    }

    draw();
    return () => clearInterval(timer);
  },
};
