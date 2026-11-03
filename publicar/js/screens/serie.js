// Serie de retenciones caminando (simulación de altitud).
// La recuperación de 60 s entre retenciones es obligatoria.

import { esc, icon, clock, toast } from '../ui.js';

const MAX = 8;
const RECOVERY = 60;

export default {
  full: true,
  render() {
    return '<section class="session" id="serie" style="align-items:stretch"></section>';
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const p = ctx.profile;
    const kid = p.kind !== 'adulto';
    const lb = store.lastBolt(p.id);
    const moderate = kid || !lb || lb.seconds < 20;
    const box = root.querySelector('#serie');
    const st = { phase: 'safety', ok: false, tried: false, holds: [], holdT0: 0, holdSecs: 0, cur: 0, left: RECOVERY };
    let timer = 0;
    const roundWord = kid ? 'Vuelta' : 'Retención';
    const header = `<div class="between"><a href="#/perfil" class="icon-btn" aria-label="Salir" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</a>
      <p style="margin:0;font-size:14px;font-weight:500">Retenciones caminando</p><span style="width:44px"></span></div>`;

    const chart = () => {
      const all = st.phase === 'recover' ? [...st.holds.map((h) => h.steps), st.cur] : st.holds.map((h) => h.steps);
      const max = Math.max(40, ...all);
      return `<div class="tile"><p class="muted" style="margin:0 0 10px;font-size:13px">Pasos por ${kid ? 'vuelta' : 'retención'}</p>
        <div class="row" style="align-items:flex-end;gap:8px;height:76px">${Array.from({ length: MAX }, (_, i) => {
          const v = all[i];
          const isCur = st.phase === 'recover' && i === all.length - 1;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span class="muted" style="font-size:11px">${v ?? ''}</span>
            <div style="width:100%;max-width:26px;border-radius:8px;height:${v === undefined ? 4 : Math.max(6, Math.round((v / max) * 50))}px;background:${v === undefined ? 'rgba(238,243,236,0.07)' : isCur ? 'var(--sage)' : 'rgba(156,197,161,0.4)'}"></div></div>`;
        }).join('')}</div></div>`;
    };

    function draw() {
      clearInterval(timer);
      if (st.phase === 'safety') {
        box.innerHTML = `<div class="stack" style="flex:1">${header}
          <span style="width:56px;height:56px;border-radius:50%;background:rgba(226,204,148,0.14);color:var(--arena);display:flex;align-items:center;justify-content:center;margin-top:10px">${icon('lock', 26)}</span>
          <h1 class="h1">Antes de empezar</h1>
          <ul class="stack" style="list-style:none;margin:6px 0 0;padding:0;font-size:15px;line-height:1.45">
            <li class="row" style="align-items:flex-start">${icon('wave', 22, 'style="color:var(--arena);flex:none"')}<span>Nunca en el agua ni manejando. Camina en un lugar plano y seguro, lejos de escaleras y calles.</span></li>
            <li class="row" style="align-items:flex-start">${icon('repeat', 22, 'style="color:var(--arena);flex:none"')}<span>Entre cada ${kid ? 'vuelta' : 'retención'} recuperas ${RECOVERY} segundos respirando normal por la nariz. La siguiente no empieza antes.</span></li>
            <li class="row" style="align-items:flex-start">${icon('timer', 22, 'style="color:var(--arena);flex:none"')}<span>${moderate ? 'Versión moderada: detente con una falta de aire leve a moderada.' : 'Tu BOLT de 20 s o más permite llegar a una falta de aire fuerte, sin forzar.'}</span></li>
            ${kid ? '' : `<li class="row" style="align-items:flex-start">${icon('sun', 22, 'style="color:var(--arena);flex:none"')}<span>Consulta a tu médico si hay embarazo, hipertensión o epilepsia.</span></li>`}
          </ul>
          <label class="tile row" style="min-height:52px;cursor:pointer"><input type="checkbox" id="ok" ${st.ok ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--sage)"> Entiendo y quiero continuar</label>
          ${st.tried && !st.ok ? '<p role="alert" style="margin:0;color:var(--brasa);font-size:13px">Marca la casilla para continuar.</p>' : ''}
          <button class="btn primary block" id="go" aria-disabled="${!st.ok}" style="margin-top:auto">${icon('play', 18)} Empezar la serie</button>
        </div>`;
        box.querySelector('#ok').addEventListener('change', (e) => { st.ok = e.target.checked; st.tried = false; draw(); });
        box.querySelector('#go').addEventListener('click', () => {
          if (!st.ok) { st.tried = true; draw(); return; }
          startHold();
        });
      } else if (st.phase === 'hold') {
        const n = st.holds.length + 1;
        box.innerHTML = `<div class="stack" style="flex:1;text-align:center">${header}
          <p class="sub" style="margin-top:10px">${roundWord} ${n} de ${MAX}</p>
          <h1 class="h1">Exhala, tápate la nariz y camina</h1>
          <p class="sub">Cuenta tus pasos.</p>
          <p class="num" id="secs" style="margin:30px 0 0;font-size:96px;line-height:1">0</p>
          <p class="sub" style="margin:0">segundos</p>
          <button class="btn primary block" id="done" style="margin-top:auto;min-height:64px;font-size:19px">Ya respiré</button>
        </div>`;
        const secs = box.querySelector('#secs');
        timer = setInterval(() => { secs.textContent = String(Math.floor((performance.now() - st.holdT0) / 1000)); }, 200);
        box.querySelector('#done').addEventListener('click', () => {
          st.holdSecs = Math.round((performance.now() - st.holdT0) / 1000);
          st.cur = st.holds.at(-1)?.steps ?? 30;
          st.left = RECOVERY;
          st.phase = 'recover';
          draw();
        });
      } else {
        const n = st.holds.length + 1;
        const last = n >= MAX;
        box.innerHTML = `<div class="stack" style="flex:1">${header}
          <p class="sub" style="text-align:center;margin-top:4px">${roundWord} ${n} de ${MAX}</p>
          <div style="display:flex;justify-content:center">
            <svg width="200" height="200" viewBox="0 0 220 220" role="img" aria-label="Recuperación">
              <circle cx="110" cy="110" r="96" fill="none" stroke="rgba(238,243,236,0.07)" stroke-width="10"/>
              <circle id="ring" cx="110" cy="110" r="96" fill="none" stroke="#9CC5A1" stroke-width="10" stroke-linecap="round" stroke-dasharray="603" stroke-dashoffset="603" transform="rotate(-90 110 110)"/>
              <text id="clk" x="110" y="112" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="54" fill="#EEF3EC">${clock(st.left)}</text>
              <text x="110" y="142" text-anchor="middle" font-family="Figtree, sans-serif" font-size="13" fill="#A9B8AC">recupera por la nariz</text>
            </svg>
          </div>
          <p class="sub" id="hint" style="text-align:center;margin:0">Respira normal por la nariz y camina tranquilo.</p>
          <div class="tile between">
            <span style="font-size:14px">¿Cuántos pasos diste?</span>
            <div class="row" style="gap:6px">
              <button class="icon-btn" style="background:var(--card)" data-d="-5" aria-label="Restar 5">−5</button>
              <button class="icon-btn" style="background:var(--card)" data-d="-1" aria-label="Restar 1">−1</button>
              <span class="num" style="min-width:48px;text-align:center;font-size:28px">${st.cur}</span>
              <button class="icon-btn" style="background:var(--card)" data-d="1" aria-label="Sumar 1">+1</button>
              <button class="icon-btn" style="background:var(--card)" data-d="5" aria-label="Sumar 5">+5</button>
            </div>
          </div>
          ${chart()}
          <div class="row" style="margin-top:auto">
            <button class="btn" id="end" style="flex:1">Terminar serie</button>
            <button class="btn primary" id="next" style="flex:2" aria-disabled="true"></button>
          </div>
        </div>`;
        box.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { st.cur = Math.max(0, st.cur + Number(b.dataset.d)); draw(); }));
        box.querySelector('#end').addEventListener('click', finish);
        const next = box.querySelector('#next');
        const ring = box.querySelector('#ring');
        const clk = box.querySelector('#clk');
        const hint = box.querySelector('#hint');
        const paint = () => {
          const waiting = st.left > 0;
          next.setAttribute('aria-disabled', String(waiting));
          next.textContent = waiting ? `Recuperando · ${clock(st.left)}` : last ? 'Terminar serie' : `Siguiente ${kid ? 'vuelta' : 'retención'}`;
          next.style.background = waiting ? 'rgba(156,197,161,0.18)' : 'var(--sage)';
          next.style.color = waiting ? 'var(--hoja)' : 'var(--on-sage)';
          ring.setAttribute('stroke-dashoffset', String(Math.round(603 * (st.left / RECOVERY))));
          clk.textContent = clock(st.left);
          if (!waiting) hint.textContent = last ? 'Terminaste las vueltas. ¡Bien hecho!' : 'Ya te recuperaste. Exhala, tápate la nariz y vuelve a caminar.';
        };
        paint();
        timer = setInterval(() => { if (st.left > 0) { st.left -= 1; paint(); } }, 1000);
        next.addEventListener('click', () => {
          if (st.left > 0) return;
          st.holds.push({ steps: st.cur, secs: st.holdSecs });
          if (st.holds.length >= MAX) { save(); return; }
          startHold();
        });
      }
    }

    function startHold() {
      st.phase = 'hold';
      st.holdT0 = performance.now();
      draw();
    }

    function finish() {
      if (st.phase === 'recover') st.holds.push({ steps: st.cur, secs: st.holdSecs });
      save();
    }

    function save() {
      clearInterval(timer);
      if (!st.holds.length) { go('perfil'); return; }
      const series = st.holds.map((h) => h.steps);
      const res = store.addSteps({ steps: Math.max(...series), seconds: st.holds.reduce((a, h) => a + h.secs, 0), type: 'serie', series });
      toast(`Serie guardada · ${series.length} ${kid ? 'vueltas' : 'retenciones'}`);
      if (res.newBadges.length) setTimeout(() => toast(`¡Nueva insignia: ${res.newBadges[0].name}!`), 2700);
      go('perfil');
    }

    draw();
    return () => clearInterval(timer);
  },
};
