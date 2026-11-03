// Medición de BOLT: toda la pantalla es el botón para empezar y para detener.

import { esc, icon, toast } from '../ui.js';
import { boltLevel } from './perfil.js';

const STEPS = {
  adulto: [
    ['user', 'Siéntate y respira normal por la nariz.'],
    ['nose', 'Exhala normal, sin vaciar de más.'],
    ['lock', 'Tápate la nariz con los dedos.'],
    ['timer', 'Toca al primer deseo de respirar, no al máximo.'],
  ],
  kid: [
    ['user', 'Siéntate tranquila.'],
    ['nose', 'Suelta el aire normal por la nariz.'],
    ['lock', 'Tápate la nariz.'],
    ['timer', 'Toca cuando quieras respirar.'],
  ],
};

const SCALE = [
  ['Inicio', '<10', '#4A5A50'],
  ['Base', '10–20', '#6B7A70'],
  ['Intermedio', '20–30', '#9CC5A1'],
  ['Avanzado', '30–40', '#B9DEC3'],
  ['Meta', '40+', '#E2CC94'],
];

export default {
  full: true,
  render() {
    return '<section class="session" id="bolt" style="align-items:stretch"></section>';
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const p = ctx.profile;
    const kid = p.kind !== 'adulto';
    const g = store.goals(p.id);
    const box = root.querySelector('#bolt');
    const st = { phase: 'intro', t0: 0, secs: 0, morning: new Date().getHours() < 10, note: '', prev: store.lastBolt(p.id) };
    let timer = 0;
    const title = kid ? 'Reto del aire' : 'BOLT score';
    const close = `<a href="#/perfil" class="icon-btn pe" aria-label="Cerrar" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</a>`;

    function draw() {
      if (st.phase === 'intro') {
        box.innerHTML = `<button class="tapzone" id="tap" aria-label="Empezar la medición"></button>
          <div class="tap-ui stack" style="flex:1">
            <div class="between">${close}<p style="margin:0;font-size:14px;font-weight:500">${esc(title)}</p><span style="width:44px"></span></div>
            <h1 class="h1" style="margin-top:18px">${kid ? '¿Cuánto aguantas tranquila?' : 'Mide tu BOLT'}</h1>
            <p class="sub">${kid ? 'Es un reto suave. No es una carrera.' : 'Mídelo al despertar y en las mismas condiciones para poder compararlo.'}</p>
            <div class="stack" style="margin-top:10px">${(kid ? STEPS.kid : STEPS.adulto).map(([ic, txt], i) => `<div class="tile row">
              <span style="width:40px;height:40px;flex:none;border-radius:50%;background:rgba(156,197,161,0.12);color:var(--hoja);display:flex;align-items:center;justify-content:center">${icon(ic, 20)}</span>
              <span style="font-size:15px">${i + 1}. ${esc(txt)}</span></div>`).join('')}</div>
            <p class="serif" style="margin-top:auto;text-align:center;font-size:22px;padding:24px 0">Toca en cualquier parte para empezar</p>
          </div>`;
        box.querySelector('#tap').addEventListener('click', start);
      } else if (st.phase === 'running') {
        box.innerHTML = `<button class="tapzone" id="tap" aria-label="Detener: ya quiero respirar"></button>
          <div class="tap-ui stack" style="flex:1;align-items:center;justify-content:center;text-align:center">
            <div style="position:relative;width:260px;height:260px;display:flex;align-items:center;justify-content:center">
              <div class="blob a"></div><div class="blob b"></div>
              <div><p class="num" id="secs" style="margin:0;font-size:96px;line-height:1">0</p><p class="sub" style="margin:0">segundos</p></div>
            </div>
            <p class="serif" style="font-size:22px;margin-top:24px">${kid ? 'Toca cuando quieras respirar' : 'Toca al primer deseo de respirar'}</p>
            <p class="sub">${kid ? 'Luego respira suavecito por la nariz.' : 'No esperes al máximo. Luego respira calmado por la nariz.'}</p>
          </div>`;
        box.querySelector('#tap').addEventListener('click', stop);
      } else {
        const v = st.secs;
        const delta = st.prev ? v - st.prev.seconds : null;
        const pct = Math.min(100, (v / 50) * 100);
        box.innerHTML = `<div class="stack" style="flex:1">
          <div class="between">${close.replace(' pe', '')}<p style="margin:0;font-size:14px;font-weight:500">${esc(title)}</p><span style="width:44px"></span></div>
          <div style="text-align:center;margin-top:12px">
            <p class="sub" style="margin:0">${kid ? 'Aguantaste' : 'Tu BOLT de hoy'}</p>
            <p class="num pop" style="margin:4px 0 0;font-size:88px;line-height:1">${v} <span style="font-family:var(--sans);font-size:22px;color:var(--text2)">s</span></p>
            ${delta !== null ? `<span class="chip ${delta >= 0 ? 'sage' : ''}" style="margin-top:10px">${delta >= 0 ? `+${delta}` : delta} s vs. la anterior</span>` : '<span class="chip" style="margin-top:10px">Tu primera medición</span>'}
          </div>
          ${kid ? '' : `<div class="card">
            <div style="position:relative;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px">
              ${SCALE.map((s) => `<div style="height:10px;border-radius:4px;background:${s[2]}"></div>`).join('')}
              <span aria-hidden="true" style="position:absolute;top:-5px;left:${pct}%;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:var(--text);border:3px solid var(--bg)"></span>
            </div>
            <div style="margin-top:8px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;text-align:center;font-size:11px;color:var(--muted)">
              ${SCALE.map((s) => `<span style="${s[0] === boltLevel(v) ? 'color:var(--hoja);font-weight:600' : ''}">${s[0]}<br>${s[1]}</span>`).join('')}
            </div>
          </div>`}
          <div class="tile between"><span>Tu meta: ${g.bolt} s</span><span>${v >= g.bolt ? '¡Meta lograda!' : `Te faltan ${g.bolt - v} s`}</span></div>
          ${kid ? '' : `<div class="tile">
            <div class="between" style="min-height:48px"><span><span style="display:block">Medición de la mañana</span><span class="muted">Al despertar, antes de cualquier actividad</span></span>
              <button class="switch" role="switch" id="morning" aria-checked="${st.morning}" aria-label="Medición de la mañana"><span></span></button></div>
            <label style="display:block;margin-top:10px"><span class="muted">Nota (opcional)</span>
              <input class="field" id="note" type="text" placeholder="Dormí bien, nariz despejada" value="${esc(st.note)}" style="margin-top:6px"></label>
          </div>`}
          <div class="stack" style="margin-top:auto">
            <button class="btn primary block" id="save">Guardar</button>
            <button class="btn block" id="again">Repetir</button>
          </div>
        </div>`;
        box.querySelector('#morning')?.addEventListener('click', (e) => {
          st.morning = !st.morning;
          e.currentTarget.setAttribute('aria-checked', String(st.morning));
        });
        box.querySelector('#note')?.addEventListener('input', (e) => { st.note = e.target.value; });
        box.querySelector('#again').addEventListener('click', () => { st.phase = 'intro'; draw(); });
        box.querySelector('#save').addEventListener('click', save);
      }
    }

    function start() {
      st.phase = 'running';
      st.t0 = performance.now();
      draw();
      const secs = box.querySelector('#secs');
      timer = setInterval(() => { secs.textContent = String(Math.floor((performance.now() - st.t0) / 1000)); }, 100);
    }

    function stop() {
      clearInterval(timer);
      st.secs = Math.round((performance.now() - st.t0) / 1000);
      st.phase = 'result';
      draw();
    }

    function save() {
      const res = store.addBolt({ seconds: st.secs, morning: kid ? true : st.morning, note: st.note });
      toast(kid ? '¡Reto guardado!' : 'BOLT guardado');
      if (res.newBadges.length) setTimeout(() => toast(`¡Nueva insignia: ${res.newBadges[0].name}!`), 2700);
      go('perfil');
    }

    // Versión Peque: la guía un adulto con un solo botón enorme.
    const peque = p.kind === 'peque' || ctx.query.get('peque') === '1';
    const bigBtn = (label, sub) => `<button id="big" style="width:240px;height:240px;border-radius:50%;border:none;background:var(--sage);color:var(--on-sage);font-family:var(--serif);font-size:34px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;margin:0 auto">
      ${label}${sub ? `<span style="font-family:var(--sans);font-size:16px">${sub}</span>` : ''}</button>`;

    function drawPeque() {
      const top = `<div class="between"><a href="#/inicio" class="icon-btn" aria-label="Cerrar" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</a><p style="margin:0;font-size:14px;font-weight:500">Reto del aire</p><span style="width:44px"></span></div>`;
      if (st.phase === 'intro') {
        box.innerHTML = `${top}<div class="stack" style="flex:1;justify-content:center;text-align:center;gap:20px">
          <h1 class="h1" style="font-size:32px">Reto del aire con mamá o papá</h1>
          <p class="sub" style="font-size:18px">Tápate la nariz y avísame cuando quieras respirar.</p>
          ${bigBtn('Empezar')}</div>`;
        box.querySelector('#big').addEventListener('click', () => {
          st.phase = 'running';
          st.t0 = performance.now();
          drawPeque();
          const big = box.querySelector('#big');
          timer = setInterval(() => { big.firstChild.textContent = `${Math.floor((performance.now() - st.t0) / 1000)} s`; }, 100);
        });
      } else if (st.phase === 'running') {
        box.innerHTML = `${top}<div class="stack" style="flex:1;justify-content:center;text-align:center;gap:20px">
          <p class="serif" style="font-size:26px;margin:0">Cuando quiera respirar, toca</p>
          ${bigBtn('0 s', '¡Ya!')}</div>`;
        box.querySelector('#big').addEventListener('click', () => {
          clearInterval(timer);
          st.secs = Math.round((performance.now() - st.t0) / 1000);
          st.phase = 'result';
          drawPeque();
        });
      } else {
        box.innerHTML = `<div class="stack" style="flex:1;justify-content:center;text-align:center;gap:16px">
          <svg width="150" height="150" viewBox="0 0 24 24" class="pop" aria-hidden="true" style="margin:0 auto"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z" fill="#E2CC94"/></svg>
          <h1 class="h1" style="font-size:36px">¡${st.secs} segundos, ${esc(p.name)}!</h1>
          <p class="sub" style="font-size:18px">Ahora respira suavecito por la nariz.</p>
          <button class="btn primary block" id="done" style="min-height:64px;font-size:20px;margin-top:16px">¡Listo!</button></div>`;
        box.querySelector('#done').addEventListener('click', () => {
          store.addBolt({ seconds: st.secs, morning: false, note: 'Con un adulto' });
          toast('¡Reto guardado!');
          go('inicio');
        });
      }
    }

    if (peque) drawPeque();
    else draw();
    return () => clearInterval(timer);
  },
};
