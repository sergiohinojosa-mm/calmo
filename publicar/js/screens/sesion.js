// Sesión guiada: animación, conteo, tonos, ambiente y pasos especiales
// (bloques de respiración ligera, pausas de control y destapar la nariz).

import { esc, icon, clock, askConfirm } from '../ui.js';
import * as catalog from '../catalog.js';
import * as audio from '../audio.js';
import { PEQUE_ART } from './inicio.js';

const { byId, nameFor, phasesFor, PHASE, AMBIENTS } = catalog;

const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const COUNTDOWN = 3;      // segundos de "Prepárate"
const HINT_EVERY = 35;    // los mensajes de guía rotan cada ~35 s (HU-2.6)
const AIR = 15;           // "Necesito aire": 15 s de respiración normal

// Textos del ejercicio para este perfil (otra parte del catálogo puede darlos en versión niña).
function texts(ex, kind) {
  const t = typeof catalog.textsFor === 'function' ? catalog.textsFor(ex, kind) : null;
  return t || {};
}

function buildSteps(ex, kind, min) {
  const phases = phasesFor(ex, kind);
  const dur = min * 60;
  if (ex.mode === 'ligero') {
    const on = kind === 'adulto' ? ex.blockOn : ex.juniorBlockOn;
    const steps = [];
    let left = dur;
    while (left > 0) {
      const a = Math.min(on, left);
      steps.push({ kind: 'breath', dur: a, phases, light: true });
      left -= a;
      if (left > 0) {
        const b = Math.min(ex.blockOff, left);
        steps.push({ kind: 'timed', dur: b, label: 'Respira normal', sub: 'Por la nariz, sin controlar' });
        left -= b;
      }
    }
    return steps;
  }
  if (ex.mode === 'pausas') {
    const steps = [];
    const rounds = kind === 'adulto' ? ex.rounds : 2;
    for (let r = 0; r < rounds; r++) {
      steps.push({ kind: 'measure', round: r + 1 });
      steps.push({ kind: 'timed', dur: 15, label: 'Recupera', sub: 'Primera respiración pequeña, recupera la calma por la nariz' });
      steps.push({ kind: 'breath', dur: kind === 'adulto' ? ex.reducedSec : 120, phases, light: true });
    }
    steps.push({ kind: 'measure', round: rounds + 1 });
    return steps;
  }
  if (ex.mode === 'destapar') {
    const steps = [];
    for (let r = 0; r < ex.reps; r++) {
      steps.push({ kind: 'timed', dur: 4, label: 'Exhala y tápate la nariz', sub: `Repetición ${r + 1} de ${ex.reps}` });
      steps.push({ kind: 'hold', max: 45, label: 'Mueve la cabeza arriba y abajo', sub: 'Toca cuando sientas falta de aire moderada' });
      steps.push({ kind: 'timed', dur: 45, label: 'Suelta y respira calmado', sub: 'Primera respiración pequeña, recupera la calma por la nariz' });
    }
    return steps;
  }
  return [{ kind: 'breath', dur, phases, alternate: ex.alternate }];
}

function breathText(peque) {
  return `<div class="breath-text">
    <p class="serif" id="phase" style="margin:0;font-size:${peque ? 36 : 30}px" aria-live="polite">Prepárate</p>
    <p class="num" id="count" style="margin:4px 0 0;font-size:${peque ? 56 : 44}px;color:var(--hoja)">3</p>
    <p id="nose" class="muted" style="margin:2px 0 0;display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)">${icon('nose', 14)} <span id="noseTxt">por la nariz</span></p>
  </div>`;
}

function stepLength(s) {
  if (s.kind === 'breath') {
    const L = s.phases.reduce((a, p) => a + p[1], 0);
    return Math.ceil(s.dur / L) * L;
  }
  return s.dur || 0;
}

export default {
  full: true,
  render(ctx) {
    const ex = byId(ctx.params[0]) || byId('coherente');
    const kind = ctx.profile.kind;
    const amb = AMBIENTS.find((a) => a.id === (ctx.query.get('amb') || ctx.store.prefs().ambient)) || AMBIENTS[0];
    const peque = kind === 'peque';
    const name = texts(ex, kind).name || nameFor(ex, kind);
    // Las filas de arriba y de abajo quedan por encima de la zona táctil de pantalla completa.
    return `<section class="session" id="ses">
      <div class="between" style="width:100%;position:relative;z-index:2">
        <button class="icon-btn" id="close" aria-label="Terminar" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</button>
        <div style="text-align:center"><p style="margin:0;font-size:14px;font-weight:500">${esc(name)}</p><p class="muted" style="margin:2px 0 0">${peque ? 'Con mamá o papá' : esc(amb.label)}</p></div>
        <button class="icon-btn" id="dim" aria-label="Bajar luz" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('moon', 18)}</button>
      </div>
      <div class="breath-wrap" ${peque ? 'style="width:min(90vw,380px)"' : ''}>
        <div class="blob a"></div><div class="blob b"></div>
        <div class="orb" id="orb"></div>
        ${peque ? `<svg id="art" width="230" height="230" viewBox="0 0 70 70" aria-hidden="true" style="position:absolute;will-change:transform">${PEQUE_ART[ex.kidVisual] || ''}</svg>` : ''}
        ${peque ? '' : breathText(false)}
      </div>
      ${peque ? breathText(true) : ''}
      <p id="hint" class="serif" style="font-style:italic;font-size:17px;line-height:1.5;color:#C9D6CB;text-align:center;min-height:52px;margin:6px 20px 0"></p>
      <div style="width:100%;max-width:340px;margin-top:auto;position:relative;z-index:2${peque ? ';visibility:hidden' : ''}" ${peque ? 'aria-hidden="true"' : ''}>
        <div class="between muted" style="font-variant-numeric:tabular-nums"><span id="remain"></span><span id="stepInfo"></span></div>
        <div class="bar" style="margin-top:8px;height:4px"><i id="prog" style="width:0%"></i></div>
      </div>
      <div class="row" style="justify-content:center;gap:22px;margin-top:22px;position:relative;z-index:2">
        <button class="btn small" id="end">Terminar</button>
        <button class="icon-btn" id="pause" aria-label="Pausar" style="width:72px;height:72px;background:var(--sage);color:var(--on-sage)">${icon('pause', 26)}</button>
        <button class="btn small" id="air" style="visibility:hidden">Necesito aire</button>
      </div>
      <button class="tapzone" id="tap" style="display:none" aria-label="Tocar"></button>
      <button id="startTap" style="display:none;position:fixed;inset:0;z-index:5;border:none;background:rgba(5,10,8,0.88);color:var(--text);font-family:var(--serif);font-size:28px" aria-label="Toca para empezar">
        <span style="display:flex;flex-direction:column;align-items:center;gap:14px">${icon('play', 40)}<span>Toca para empezar</span><span style="font-family:var(--sans);font-size:14px;color:var(--text2)">Así se activan el sonido y la guía</span></span>
      </button>
    </section>`;
  },

  mount(root, ctx) {
    const { store, go, query } = ctx;
    const ex = byId(ctx.params[0]) || byId('coherente');
    if (ex.mode === 'serie') { go('serie'); return null; }
    const kind = ctx.profile.kind;
    const peque = kind === 'peque';
    const prefs = store.prefs();
    const tx = texts(ex, kind);
    const min = Math.max(1, Number(query.get('min')) || tx.defaultMin || ex.defaultMin);
    const steps = buildSteps(ex, kind, min);
    const total = steps.reduce((a, s) => a + stepLength(s), 0);
    const $ = (id) => root.querySelector('#' + id);
    const el = { ses: $('ses'), orb: $('orb'), art: $('art'), phase: $('phase'), count: $('count'), nose: $('nose'), noseTxt: $('noseTxt'), hint: $('hint'), remain: $('remain'), info: $('stepInfo'), prog: $('prog'), pause: $('pause'), air: $('air'), tap: $('tap'), startTap: $('startTap') };
    const hints = (tx.hints && tx.hints.length ? tx.hints : ex.hints) || [];
    const routineId = query.get('rutina') || undefined;

    const voice = (text) => {
      if (!peque || !('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-MX';
        u.rate = 0.85;
        u.pitch = 1.1;
        speechSynthesis.speak(u);
      } catch (e) { /* sin voz */ }
    };

    // El tiempo sale del reloj real menos lo pausado, no de los cuadros dibujados:
    // así no se atrasa si el teléfono va lento.
    let started = false;
    let runStart = 0;
    let pausedTotal = 0;
    let pausedAt = null;
    const now = () => {
      if (!started) return 0;
      const t = performance.now();
      return (t - runStart - pausedTotal - (pausedAt !== null ? t - pausedAt : 0)) / 1000;
    };

    let startedAt = new Date();
    let si = 0;
    let stepStart = COUNTDOWN; // tiempo de sesión en que empezó el paso actual
    let done = 0;              // segundos de pasos ya terminados
    let airStart = null;
    let lastKey = '';
    let lastHint = -1;
    let curLabel = 'Prepárate';
    let measure = { state: 'ready' };
    const pauses = [];
    let raf = 0;
    let finished = false;

    const setOrb = (scale, color) => {
      el.orb.style.transform = `scale(${scale.toFixed(4)})`;
      el.orb.style.background = color + '33';
      el.orb.style.border = `1.5px solid ${color}8C`;
      if (el.art) el.art.style.transform = `scale(${(0.7 + (scale - 0.72) * 1.2).toFixed(4)})`;
    };

    // La etiqueta de la fase se recuerda para volver a mostrarla al reanudar.
    const setPhase = (text) => {
      curLabel = text;
      if (pausedAt === null) el.phase.textContent = text;
    };
    const setHint = (text) => { el.hint.textContent = text; lastHint = -1; };

    const phaseLabel = (p) => {
      if (p[2]) return p[2];
      return kind === 'adulto' ? PHASE[p[0]].label : PHASE[p[0]].kid;
    };

    function onPhase(p, cycle, step) {
      const type = p[0];
      if (prefs.tones) audio.tone(PHASE[type].freq, type);
      const label = phaseLabel(p);
      voice((type === 'in' || type === 'out') && !/nariz/i.test(label) ? `${label} por la nariz` : label);
      if (step.alternate && type === 'in') el.noseTxt.textContent = cycle % 2 ? 'por la derecha' : 'por la izquierda';
      else if (step.alternate && type === 'out') el.noseTxt.textContent = cycle % 2 ? 'por la izquierda' : 'por la derecha';
      else el.noseTxt.textContent = 'por la nariz';
      setPhase(label);
    }

    function tapMode(on, label) {
      el.tap.style.display = on ? 'block' : 'none';
      if (label) el.tap.setAttribute('aria-label', label);
    }

    // Avanza al siguiente paso. `len` mantiene exacta la duración de los pasos con tiempo fijo.
    function next(T, len) {
      done += stepLength(steps[si]) || 0;
      si += 1;
      stepStart = len !== undefined ? stepStart + len : T;
      lastKey = '';
      measure = { state: 'ready' };
      if (si >= steps.length) save(true);
    }

    function frame() {
      if (finished) return;
      const T = now();
      const step = steps[si];
      if (T < COUNTDOWN) {
        setPhase(kind === 'adulto' ? 'Prepárate' : '¡Prepárate!');
        el.count.textContent = String(Math.max(1, Math.ceil(COUNTDOWN - T)));
        setOrb(0.72, PHASE.in.color);
        raf = requestAnimationFrame(frame);
        return;
      }
      el.air.style.visibility = step.light ? 'visible' : 'hidden';

      if (airStart !== null && T >= airStart + AIR) {
        stepStart += AIR; // el paso retoma donde se quedó
        airStart = null;
        lastKey = '';
        lastHint = -1;
      }
      const t = (airStart !== null ? airStart : T) - stepStart;

      if (airStart !== null) {
        setPhase('Respira normal');
        if (el.hint.textContent !== 'Respira normal, sin controlar') setHint('Respira normal, sin controlar');
        el.count.textContent = String(Math.max(1, Math.ceil(airStart + AIR - T)));
        setOrb(0.8 + 0.03 * Math.sin(performance.now() / 700), PHASE.wait.color);
      } else if (step.kind === 'breath') {
        const L = step.phases.reduce((a, p) => a + p[1], 0);
        const end = stepLength(step);
        if (t >= end) { next(T, end); raf = requestAnimationFrame(frame); return; }
        const cycle = Math.floor(t / L);
        let ct = t - cycle * L;
        const small = step.light ? 0.84 : 0.72;
        const big = step.light ? 0.94 : 1;
        const inTotal = step.phases.filter((p) => p[0] === 'in').reduce((a, p) => a + p[1], 0) || 1;
        let scale = small;
        let k = 0;
        for (; k < step.phases.length; k++) {
          const [type, d] = step.phases[k];
          const from = scale;
          const to = type === 'in' ? from + (big - small) * (d / inTotal) : type === 'out' ? small : from;
          if (ct < d) { scale = from + (to - from) * ease(ct / d); break; }
          ct -= d;
          scale = to;
        }
        k = Math.min(k, step.phases.length - 1);
        const p = step.phases[k];
        const key = `${si}:${cycle}:${k}`;
        if (key !== lastKey) { lastKey = key; onPhase(p, cycle, step); }
        const h = hints.length ? Math.floor((T - COUNTDOWN) / HINT_EVERY) % hints.length : -1;
        if (h >= 0 && h !== lastHint) { el.hint.textContent = hints[h]; lastHint = h; }
        el.count.textContent = String(Math.max(1, Math.ceil(p[1] - ct)));
        setOrb(scale, PHASE[p[0]].color);
      } else if (step.kind === 'timed') {
        if (t >= step.dur) { next(T, step.dur); raf = requestAnimationFrame(frame); return; }
        if (lastKey !== `${si}`) { lastKey = `${si}`; setPhase(step.label); setHint(step.sub || ''); if (prefs.tones) audio.tone(PHASE.wait.freq, 'wait'); }
        el.count.textContent = String(Math.max(1, Math.ceil(step.dur - t)));
        el.noseTxt.textContent = 'por la nariz';
        setOrb(0.8 + 0.02 * Math.sin(performance.now() / 800), PHASE.wait.color);
      } else if (step.kind === 'hold') {
        if (lastKey !== `${si}`) { lastKey = `${si}`; setPhase(step.label); setHint(step.sub); tapMode(true, 'Ya, soltar el aire'); if (prefs.tones) audio.tone(PHASE.hold.freq, 'hold'); }
        el.count.textContent = String(Math.floor(t));
        setOrb(1, PHASE.hold.color);
        if (t >= step.max) { tapMode(false); next(T); }
      } else if (step.kind === 'measure') {
        if (lastKey !== `${si}`) {
          lastKey = `${si}`;
          setPhase(`Pausa de control ${step.round}`);
          setHint('Exhala normal, tápate la nariz y toca la pantalla para empezar.');
          el.count.textContent = '·';
          tapMode(true, 'Empezar pausa de control');
        }
        if (measure.state === 'running') {
          el.count.textContent = String(Math.floor(T - measure.start));
          if (el.hint.textContent !== 'Toca al primer deseo de respirar.') setHint('Toca al primer deseo de respirar.');
        } else if (measure.state === 'shown' && T >= measure.until) {
          tapMode(false);
          next(T);
        }
        setOrb(0.86, PHASE.hold.color);
      }

      const cur = steps[si];
      const elapsed = done + (cur && cur.kind !== 'measure' && cur.kind !== 'hold' ? Math.min(Math.max(0, t), stepLength(cur)) : 0);
      el.prog.style.width = `${total ? Math.min(100, (elapsed / total) * 100) : 0}%`;
      el.remain.textContent = total ? `Quedan ${clock(Math.max(0, total - elapsed))}` : '';
      el.info.textContent = ex.mode === 'pausas' ? `Pausas: ${pauses.map((v) => `${v} s`).join(' · ') || '—'}` : '';
      raf = requestAnimationFrame(frame);
    }

    function setPaused(on, why) {
      if (!started || finished || on === (pausedAt !== null)) return;
      if (on) {
        pausedAt = performance.now();
        el.phase.textContent = 'En pausa';
        if (why) setHint(why);
        audio.pauseAmbient();
        try { speechSynthesis.pause(); } catch (e) { /* sin voz */ }
      } else {
        pausedTotal += performance.now() - pausedAt;
        pausedAt = null;
        el.phase.textContent = curLabel;
        lastHint = -1;
        audio.resumeAmbient();
        try { speechSynthesis.resume(); } catch (e) { /* sin voz */ }
        audio.keepScreenOn();
      }
      el.pause.innerHTML = icon(on ? 'play' : 'pause', 26);
      el.pause.setAttribute('aria-label', on ? 'Seguir' : 'Pausar');
    }

    // Si el teléfono se bloquea o cambias de app, la guía se pausa en lugar de congelarse.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setPaused(true, 'La sesión se pausó. Toca seguir cuando quieras.');
    };
    document.addEventListener('visibilitychange', onVisibility);

    function teardown() {
      finished = true;
      cancelAnimationFrame(raf);
      audio.stopAll();
      audio.releaseScreen();
      try { speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
      delete document.body.dataset.session;
      document.removeEventListener('visibilitychange', onVisibility);
    }

    function save(complete) {
      if (finished) return;
      const secs = Math.round(Math.max(0, now() - COUNTDOWN));
      teardown();
      const res = store.addSession({ exerciseId: ex.id, startedAt, durationSec: Math.max(secs, peque && complete ? 30 : secs), controlPauses: pauses.length ? pauses : undefined, routineId });
      try {
        sessionStorage.setItem('calmo.last', JSON.stringify({
          exerciseId: ex.id, durationSec: res.session.durationSec, minutePoints: res.minutePoints, plannedPoints: res.plannedPoints,
          routineName: res.routine?.name || '', newBadges: res.newBadges.map((b) => b.id), controlPauses: pauses, complete, sessionId: res.session.id,
        }));
      } catch (e) { /* sin sessionStorage */ }
      go('resumen');
    }

    // Terminar antes: con menos de 30 s no se guarda, y se avisa antes de salir.
    function requestEnd() {
      if (finished) return;
      if (!started) { teardown(); go('inicio'); return; }
      if (now() - COUNTDOWN >= 30) { save(false); return; }
      const wasPaused = pausedAt !== null;
      setPaused(true);
      askConfirm('Llevas menos de 30 segundos y no se guardará. ¿Salir?', { ok: 'Salir', cancel: 'Seguir' }).then((ok) => {
        if (ok) { teardown(); go('inicio'); } else if (!wasPaused) setPaused(false);
      });
    }

    function begin() {
      if (started) return;
      audio.unlock();
      audio.setVolumes({ tones: prefs.tonesVol, music: prefs.music });
      audio.startAmbient(query.get('amb') || prefs.ambient);
      audio.keepScreenOn();
      audio.setNowPlaying(`Calmo · ${tx.name || nameFor(ex, kind)}`);
      document.body.dataset.session = 'on';
      startedAt = new Date();
      runStart = performance.now();
      started = true;
      raf = requestAnimationFrame(frame);
    }

    el.tap.addEventListener('click', () => {
      const step = steps[si];
      if (!step || pausedAt !== null || !started) return;
      const T = now();
      if (step.kind === 'hold') { tapMode(false); next(T); return; }
      if (step.kind === 'measure') {
        if (measure.state === 'ready') { measure = { state: 'running', start: T }; tapMode(true, 'Detener pausa de control'); }
        else if (measure.state === 'running') {
          const v = Math.round(T - measure.start);
          pauses.push(v);
          measure = { state: 'shown', until: T + 2.2 };
          setPhase(`${v} segundos`);
          setHint('Primera respiración pequeña, recupera la calma.');
          tapMode(false);
        }
      }
    });
    el.pause.addEventListener('click', () => setPaused(pausedAt === null));
    el.air.addEventListener('click', () => { if (started && pausedAt === null && airStart === null) airStart = now(); });
    root.querySelector('#dim').addEventListener('click', () => el.ses.classList.toggle('dim'));
    root.querySelector('#end').addEventListener('click', requestEnd);
    root.querySelector('#close').addEventListener('click', requestEnd);

    // Si se llegó aquí sin un toque previo (por ejemplo, al recargar), iOS no deja sonar
    // nada: un toque en la pantalla activa el sonido y arranca la cuenta regresiva.
    audio.unlock();
    if (audio.running()) begin();
    else {
      el.startTap.style.display = 'block';
      el.startTap.addEventListener('click', () => {
        el.startTap.style.display = 'none';
        begin();
      }, { once: true });
    }

    return () => { if (!finished) teardown(); };
  },
};
