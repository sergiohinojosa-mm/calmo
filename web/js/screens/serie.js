// Serie de retenciones caminando (simulación de altitud).
// La recuperación de 60 s entre retenciones es obligatoria.

import { esc, icon, clock, toast, plural, confetti, askConfirm } from '../ui.js';

const MIN = 6;
const MAX = 10;
const RECOVERY = 60;
const POINTS = 5;

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
    const gentle = !kid && (!lb || lb.seconds < 12);
    const box = root.querySelector('#serie');
    // recT0: cuándo empezó la recuperación. La cuenta sale de ahí, así no se reinicia con cada toque.
    // holdT0 vale 0 hasta que se toca «Empezar a caminar»: el cronómetro arranca con la retención, no antes.
    const st = { phase: 'safety', holds: [], holdT0: 0, holdSecs: 0, cur: null, recT0: 0, left: RECOVERY };
    let timer = 0;
    let saved = false; // evita guardar dos veces con un doble toque
    const roundWord = kid ? 'Vuelta' : 'Retención';
    const one = kid ? 'vuelta' : 'retención';
    const many = kid ? 'vueltas' : 'retenciones';
    const header = `<div class="between"><button class="icon-btn" id="quit" aria-label="Salir" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</button>
      <p style="margin:0;font-size:14px;font-weight:500">${kid ? 'Camina sin respirar' : 'Retenciones caminando'}</p><span style="width:44px"></span></div>`;
    const leftNow = () => Math.max(0, RECOVERY - Math.floor((Date.now() - st.recT0) / 1000));

    const chart = () => {
      const all = st.phase === 'recover' ? [...st.holds.map((h) => h.steps), st.cur] : st.holds.map((h) => h.steps);
      const max = Math.max(40, ...all);
      return `<div class="tile"><p class="muted" style="margin:0 0 10px;font-size:13px">Pasos por ${one}</p>
        <div class="row" style="align-items:flex-end;gap:6px;height:76px">${Array.from({ length: MAX }, (_, i) => {
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
            <li class="row" style="align-items:flex-start">${icon('wave', 22, 'style="color:var(--arena);flex:none"')}<span>${kid ? 'Nunca en el agua. Camina en un lugar plano y seguro, con papá o mamá cerca.' : 'Nunca en el agua ni manejando. Camina en un lugar plano y seguro, lejos de escaleras y calles.'}</span></li>
            <li class="row" style="align-items:flex-start">${icon('repeat', 22, 'style="color:var(--arena);flex:none"')}<span>${kid ? `Haz de ${MIN} a ${MAX} ${many}. Entre cada ${one} descansas ${RECOVERY} segundos respirando suavecito por la nariz.` : `Haz de ${MIN} a ${MAX} ${many}. Entre cada ${one} recuperas ${RECOVERY} segundos: primeras respiraciones pequeñas y en calma por la nariz. La siguiente no empieza antes.`}</span></li>
            <li class="row" style="align-items:flex-start">${icon('timer', 22, 'style="color:var(--arena);flex:none"')}<span>${kid ? 'Para en cuanto tengas ganas de respirar.' : gentle ? 'Versión suave: detente con una falta de aire leve. (Tu BOLT es menor de 12 s o todavía no lo mides.)' : moderate ? 'Versión moderada: detente con una falta de aire leve a moderada.' : 'Tu BOLT de 20 s o más permite llegar a una falta de aire fuerte, sin forzar.'}</span></li>
            ${kid ? '' : `<li class="row" style="align-items:flex-start">${icon('sun', 22, 'style="color:var(--arena);flex:none"')}<span>Si estás embarazada, no hagas retenciones. Si tienes presión alta o baja, problemas del corazón, diabetes, epilepsia, asma no controlada, apnea, ansiedad o ataques de pánico, desmayos, gripe o resfriado, quédate en una falta de aire leve y consulta a tu médico.</span></li>`}
          </ul>
          <button class="btn primary block" id="go" style="margin-top:auto">${icon('play', 18)} Empezar la serie</button>
        </div>`;
        box.querySelector('#go').addEventListener('click', startHold);
      } else if (st.phase === 'hold') {
        const n = st.holds.length + 1;
        const going = st.holdT0 > 0;
        box.innerHTML = `<div class="stack" style="flex:1;text-align:center">${header}
          <p class="sub" style="margin-top:10px">${roundWord} ${n} · de ${MIN} a ${MAX}</p>
          <h1 class="h1">${kid ? 'Suelta el aire, tápate la nariz y camina' : 'Exhala, tápate la nariz y camina'}</h1>
          <p class="sub">${going ? 'Cuenta tus pasos.' : kid ? 'Cuando ya tengas la nariz tapada, toca «Empezar a caminar».' : 'Con la nariz ya tapada, toca «Empezar a caminar».'}</p>
          <p class="num" id="secs" style="margin:30px 0 0;font-size:96px;line-height:1">${going ? Math.floor((performance.now() - st.holdT0) / 1000) : 0}</p>
          <p class="sub" style="margin:0">segundos</p>
          <button class="btn primary block" id="done" style="margin-top:auto;min-height:64px;font-size:19px">${going ? 'Ya respiré' : `${icon('play', 18)} Empezar a caminar`}</button>
        </div>`;
        const secs = box.querySelector('#secs');
        if (going) timer = setInterval(() => { secs.textContent = String(Math.floor((performance.now() - st.holdT0) / 1000)); }, 200);
        box.querySelector('#done').addEventListener('click', () => {
          if (!st.holdT0) { st.holdT0 = performance.now(); draw(); return; }
          st.holdSecs = Math.round((performance.now() - st.holdT0) / 1000);
          // Los pasos los escribe quien camina; no se adivinan.
          st.cur = null;
          st.recT0 = Date.now();
          st.left = RECOVERY;
          st.phase = 'recover';
          draw();
        });
      } else {
        const n = st.holds.length + 1;
        const last = n >= MAX;
        box.innerHTML = `<div class="stack" style="flex:1">${header}
          <p class="sub" style="text-align:center;margin-top:4px">${roundWord} ${n} · de ${MIN} a ${MAX}</p>
          <div style="display:flex;justify-content:center">
            <svg width="200" height="200" viewBox="0 0 220 220" role="img" aria-label="${kid ? 'Descanso' : 'Recuperación'}">
              <circle cx="110" cy="110" r="96" fill="none" stroke="rgba(238,243,236,0.07)" stroke-width="10"/>
              <circle id="ring" cx="110" cy="110" r="96" fill="none" stroke="#9CC5A1" stroke-width="10" stroke-linecap="round" stroke-dasharray="603" stroke-dashoffset="603" transform="rotate(-90 110 110)"/>
              <text id="clk" x="110" y="112" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="54" fill="#EEF3EC">${clock(leftNow())}</text>
              <text x="110" y="142" text-anchor="middle" font-family="Figtree, sans-serif" font-size="13" fill="#A9B8AC">${kid ? 'descansa por la nariz' : 'recupera por la nariz'}</text>
            </svg>
          </div>
          <p class="sub" id="hint" style="text-align:center;margin:0">Respira normal por la nariz y camina tranquilo.</p>
          <label class="tile stack" style="gap:8px">
            <span style="font-size:15px;font-weight:600">¿Cuántos pasos diste?</span>
            <input class="field num" id="cur" type="number" inputmode="numeric" pattern="[0-9]*" min="1" max="400" value="${st.cur ?? ''}" placeholder="${st.holds.length ? `La vez pasada: ${st.holds.at(-1).steps}` : 'Escribe el número'}" aria-label="Pasos que diste" style="min-height:56px;font-size:26px;text-align:center">
            <span id="curErr" role="alert" style="color:var(--brasa);font-size:13px;min-height:16px"></span>
          </label>
          <div id="chart">${chart()}</div>
          <div class="row" style="margin-top:auto">
            <button class="btn" id="end" style="flex:1">Terminar</button>
            <button class="btn primary" id="next" style="flex:2" aria-disabled="true"></button>
          </div>
        </div>`;
        const cur = box.querySelector('#cur');
        const chartBox = box.querySelector('#chart');
        // Escribir los pasos solo cambia el número y la barra: la cuenta de recuperación sigue igual.
        cur.addEventListener('input', () => {
          const v = parseInt(cur.value, 10);
          st.cur = Number.isFinite(v) && v > 0 ? Math.min(400, v) : null;
          box.querySelector('#curErr').textContent = '';
          chartBox.innerHTML = chart();
        });
        box.querySelector('#end').addEventListener('click', finish);
        const next = box.querySelector('#next');
        const ring = box.querySelector('#ring');
        const clk = box.querySelector('#clk');
        const hint = box.querySelector('#hint');
        let shown = -1;
        const paint = () => {
          st.left = leftNow();
          if (st.left === shown) return;
          shown = st.left;
          const waiting = st.left > 0;
          next.setAttribute('aria-disabled', String(waiting));
          next.textContent = waiting ? `${kid ? 'Descansando' : 'Recuperando'} · ${clock(st.left)}` : last ? 'Terminar serie' : `Siguiente ${one}`;
          next.style.background = waiting ? 'rgba(156,197,161,0.18)' : 'var(--sage)';
          next.style.color = waiting ? 'var(--hoja)' : 'var(--on-sage)';
          ring.setAttribute('stroke-dashoffset', String(Math.round(603 * (st.left / RECOVERY))));
          clk.textContent = clock(st.left);
          if (!waiting) {
            hint.textContent = last ? `Terminaste las ${MAX} ${many}. ¡Bien hecho!`
              : n >= MIN ? `Ya llevas ${plural(n, one, many)}. Puedes terminar o seguir hasta ${MAX}.`
                : kid ? '¡Listo! Suelta el aire, tápate la nariz y vuelve a caminar.' : 'Ya te recuperaste. Exhala, tápate la nariz y vuelve a caminar.';
          }
        };
        paint();
        timer = setInterval(paint, 250);
        next.addEventListener('click', () => {
          if (leftNow() > 0) return;
          if (!askSteps()) return;
          st.holds.push({ steps: st.cur, secs: st.holdSecs });
          if (st.holds.length >= MAX) { save(); return; }
          startHold();
        });
      }
      box.querySelector('#quit').addEventListener('click', quit);
    }

    function startHold() {
      st.phase = 'hold';
      st.holdT0 = 0;
      draw();
    }

    // La X no pierde lo hecho: con vueltas hechas o en la recuperación, pregunta antes de salir.
    async function quit() {
      if (!st.holds.length && st.phase !== 'recover') { clearInterval(timer); go('perfil'); return; }
      const ok = await askConfirm(kid ? '¿Ya terminaste? Guardamos tus vueltas.' : '¿Salir de la serie? Se guardan las retenciones que hiciste.', { ok: 'Guardar y salir', cancel: 'Seguir' });
      if (ok) finish();
    }

    // Antes de seguir o terminar, la vuelta necesita sus pasos.
    function askSteps() {
      if (st.cur) return true;
      const err = box.querySelector('#curErr');
      if (err) err.textContent = 'Escribe cuántos pasos diste.';
      box.querySelector('#cur')?.focus();
      return false;
    }

    function finish() {
      if (st.phase === 'recover') {
        if (!askSteps()) return;
        st.holds.push({ steps: st.cur, secs: st.holdSecs });
      }
      save();
    }

    function save() {
      clearInterval(timer);
      if (saved) return;
      saved = true;
      if (!st.holds.length) { go('perfil'); return; }
      const series = st.holds.map((h) => h.steps);
      const res = store.addSteps({ steps: Math.max(...series), seconds: st.holds.reduce((a, h) => a + h.secs, 0), type: 'serie', series });
      const pts = typeof store.awardPoints === 'function' ? store.awardPoints(p.id, POINTS, 'serie') : 0;
      toast(`${kid ? '¡Muy bien!' : 'Serie guardada'} · ${plural(series.length, one, many)}${pts ? ` · +${plural(pts, 'hoja', 'hojas')}` : ''}`);
      if (kid) confetti();
      if (res.newBadges.length) setTimeout(() => toast(`¡Nueva insignia: ${res.newBadges[0].name}!`), 2700);
      go('perfil');
    }

    draw();
    return () => clearInterval(timer);
  },
};
