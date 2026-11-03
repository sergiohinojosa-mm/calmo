// Sesión guiada: animación, conteo, tonos, ambiente y pasos especiales
// (bloques de respiración ligera, pausas de control y destapar la nariz).

import { esc, icon, clock } from '../ui.js';
import { byId, nameFor, phasesFor, PHASE, AMBIENTS } from '../catalog.js';
import * as audio from '../audio.js';
import { PEQUE_ART } from './inicio.js';

const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

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
      steps.push({ kind: 'timed', dur: 15, label: 'Recupera', sub: 'Respira normal por la nariz' });
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
      steps.push({ kind: 'timed', dur: 45, label: 'Suelta y respira calmado', sub: 'Por la nariz' });
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
    return `<section class="session" id="ses">
      <div class="between" style="width:100%">
        <button class="icon-btn" id="close" aria-label="Terminar y guardar" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('x', 18)}</button>
        <div style="text-align:center"><p style="margin:0;font-size:14px;font-weight:500">${esc(nameFor(ex, kind))}</p><p class="muted" style="margin:2px 0 0">${peque ? 'Con mamá o papá' : esc(amb.label)}</p></div>
        <button class="icon-btn" id="dim" aria-label="Bajar luz" style="background:rgba(238,243,236,0.06);color:var(--text2)">${icon('moon', 18)}</button>
      </div>
      <div class="breath-wrap">
        <div class="blob a"></div><div class="blob b"></div>
        <div class="orb" id="orb"></div>
        ${peque ? `<svg id="art" width="170" height="170" viewBox="0 0 70 70" aria-hidden="true" style="position:absolute;will-change:transform">${PEQUE_ART[ex.kidVisual] || ''}</svg>` : ''}
        ${peque ? '' : breathText(false)}
      </div>
      ${peque ? breathText(true) : ''}
      <p id="hint" class="serif" style="font-style:italic;font-size:17px;line-height:1.5;color:#C9D6CB;text-align:center;min-height:52px;margin:6px 20px 0"></p>
      <div style="width:100%;max-width:340px;margin-top:auto">
        <div class="between muted" style="font-variant-numeric:tabular-nums"><span id="remain"></span><span id="stepInfo"></span></div>
        <div class="bar" style="margin-top:8px;height:4px"><i id="prog" style="width:0%"></i></div>
      </div>
      <div class="row" style="justify-content:center;gap:22px;margin-top:22px">
        <button class="btn small" id="end">Terminar</button>
        <button class="icon-btn" id="pause" aria-label="Pausar" style="width:72px;height:72px;background:var(--sage);color:var(--on-sage)">${icon('pause', 26)}</button>
        <button class="btn small" id="air" style="visibility:hidden">Necesito aire</button>
      </div>
      <button class="tapzone" id="tap" style="display:none" aria-label="Tocar"></button>
    </section>`;
  },

  mount(root, ctx) {
    const { store, go, query } = ctx;
    const ex = byId(ctx.params[0]) || byId('coherente');
    if (ex.mode === 'serie') { go('serie'); return null; }
    const kind = ctx.profile.kind;
    const peque = kind === 'peque';
    const prefs = store.prefs();
    const min = Math.max(1, Number(query.get('min')) || ex.defaultMin);
    const steps = buildSteps(ex, kind, min);
    const total = steps.reduce((a, s) => a + stepLength(s), 0);
    const $ = (id) => root.querySelector('#' + id);
    const el = { ses: $('ses'), orb: $('orb'), art: $('art'), phase: $('phase'), count: $('count'), nose: $('nose'), noseTxt: $('noseTxt'), hint: $('hint'), remain: $('remain'), info: $('stepInfo'), prog: $('prog'), pause: $('pause'), air: $('air'), tap: $('tap') };
    const hints = ex.hints || [];

    audio.unlock();
    audio.setVolumes({ tones: prefs.tonesVol, music: prefs.music });
    audio.startAmbient(query.get('amb') || prefs.ambient);
    audio.keepScreenOn();
    document.body.dataset.session = 'on';

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

    const startedAt = new Date();
    let si = 0;
    let t = 0;            // segundos dentro del paso actual
    let active = 0;       // segundos de práctica efectiva
    let done = 0;         // segundos de pasos ya terminados
    let paused = false;
    let countdown = 3;
    let airLeft = 0;
    let lastKey = '';
    let lastTs = performance.now();
    let measure = { state: 'ready', t: 0 };
    let shownValue = 0;
    const pauses = [];
    let raf = 0;
    let finished = false;

    const setOrb = (scale, color) => {
      el.orb.style.transform = `scale(${scale.toFixed(4)})`;
      el.orb.style.background = color + '33';
      el.orb.style.border = `1.5px solid ${color}8C`;
      if (el.art) el.art.style.transform = `scale(${(0.7 + (scale - 0.72) * 1.2).toFixed(4)})`;
    };

    const phaseLabel = (p) => {
      if (p[2]) return p[2];
      return kind === 'adulto' ? PHASE[p[0]].label : PHASE[p[0]].kid;
    };

    function onPhase(p, cycle, step) {
      const type = p[0];
      if (prefs.tones) audio.tone(PHASE[type].freq, type);
      const label = phaseLabel(p);
      voice(label);
      if (step.alternate && type === 'in') el.noseTxt.textContent = cycle % 2 ? 'por la derecha' : 'por la izquierda';
      else if (step.alternate && type === 'out') el.noseTxt.textContent = cycle % 2 ? 'por la izquierda' : 'por la derecha';
      else el.noseTxt.textContent = 'por la nariz';
      el.phase.textContent = label;
      if (hints.length && cycle % 3 === 0 && type === 'in') el.hint.textContent = hints[Math.floor(cycle / 3) % hints.length];
    }

    function tapMode(on, label) {
      el.tap.style.display = on ? 'block' : 'none';
      if (label) el.tap.setAttribute('aria-label', label);
    }

    function next() {
      done += stepLength(steps[si]) || 0;
      si += 1;
      t = 0;
      lastKey = '';
      measure = { state: 'ready', t: 0 };
      if (si >= steps.length) finish(true);
    }

    function frame(ts) {
      const dt = Math.min(0.25, (ts - lastTs) / 1000);
      lastTs = ts;
      if (finished) return;
      const step = steps[si];
      if (countdown > 0) {
        if (!paused) countdown -= dt;
        el.phase.textContent = kind === 'adulto' ? 'Prepárate' : '¡Prepárate!';
        el.count.textContent = String(Math.max(1, Math.ceil(countdown)));
        setOrb(0.72, PHASE.in.color);
        raf = requestAnimationFrame(frame);
        return;
      }
      const running = !paused;
      el.air.style.visibility = step.light ? 'visible' : 'hidden';

      if (airLeft > 0) {
        if (running) { airLeft -= dt; active += dt; }
        el.phase.textContent = 'Respira normal';
        el.count.textContent = String(Math.ceil(airLeft));
        setOrb(0.8 + 0.03 * Math.sin(ts / 700), PHASE.wait.color);
      } else if (step.kind === 'breath') {
        if (running) { t += dt; active += dt; }
        const L = step.phases.reduce((a, p) => a + p[1], 0);
        const end = stepLength(step);
        if (t >= end) { next(); raf = requestAnimationFrame(frame); return; }
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
        el.count.textContent = String(Math.max(1, Math.ceil(p[1] - ct)));
        setOrb(scale, PHASE[p[0]].color);
      } else if (step.kind === 'timed') {
        if (running) { t += dt; active += dt; }
        if (t >= step.dur) { next(); raf = requestAnimationFrame(frame); return; }
        if (lastKey !== `${si}`) { lastKey = `${si}`; el.phase.textContent = step.label; el.hint.textContent = step.sub || ''; if (prefs.tones) audio.tone(PHASE.wait.freq, 'wait'); }
        el.count.textContent = String(Math.ceil(step.dur - t));
        el.noseTxt.textContent = 'por la nariz';
        setOrb(0.8 + 0.02 * Math.sin(ts / 800), PHASE.wait.color);
      } else if (step.kind === 'hold') {
        if (running) { t += dt; active += dt; }
        if (lastKey !== `${si}`) { lastKey = `${si}`; el.phase.textContent = step.label; el.hint.textContent = step.sub; tapMode(true, 'Ya, soltar el aire'); if (prefs.tones) audio.tone(PHASE.hold.freq, 'hold'); }
        el.count.textContent = String(Math.floor(t));
        setOrb(1, PHASE.hold.color);
        if (t >= step.max) { tapMode(false); next(); }
      } else if (step.kind === 'measure') {
        if (lastKey !== `${si}`) {
          lastKey = `${si}`;
          el.phase.textContent = `Pausa de control ${step.round}`;
          el.hint.textContent = 'Exhala normal, tápate la nariz y toca la pantalla para empezar.';
          el.count.textContent = '·';
          tapMode(true, 'Empezar pausa de control');
        }
        if (measure.state === 'running') {
          measure.t += dt;
          el.count.textContent = String(Math.floor(measure.t));
          el.hint.textContent = 'Toca al primer deseo de respirar.';
        } else if (measure.state === 'shown') {
          shownValue -= dt;
          if (shownValue <= 0) { tapMode(false); next(); }
        }
        setOrb(0.86, PHASE.hold.color);
      }

      const elapsed = done + (steps[si] && steps[si].kind !== 'measure' && steps[si].kind !== 'hold' ? Math.min(t, stepLength(steps[si])) : 0);
      el.prog.style.width = `${total ? Math.min(100, (elapsed / total) * 100) : 0}%`;
      el.remain.textContent = total ? `Quedan ${clock(Math.max(0, total - elapsed))}` : '';
      el.info.textContent = ex.mode === 'pausas' ? `Pausas: ${pauses.map((v) => `${v} s`).join(' · ') || '—'}` : '';
      raf = requestAnimationFrame(frame);
    }

    function finish(complete) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      audio.stopAll();
      audio.releaseScreen();
      try { speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
      delete document.body.dataset.session;
      const secs = Math.round(active);
      if (secs < 30 && !(complete && peque)) {
        go('inicio');
        return;
      }
      const res = store.addSession({ exerciseId: ex.id, startedAt, durationSec: Math.max(secs, peque ? 30 : secs), controlPauses: pauses.length ? pauses : undefined });
      try {
        sessionStorage.setItem('calmo.last', JSON.stringify({
          exerciseId: ex.id, durationSec: res.session.durationSec, minutePoints: res.minutePoints, plannedPoints: res.plannedPoints,
          routineName: res.routine?.name || '', newBadges: res.newBadges.map((b) => b.id), controlPauses: pauses, complete,
        }));
      } catch (e) { /* sin sessionStorage */ }
      go('resumen');
    }

    el.tap.addEventListener('click', () => {
      const step = steps[si];
      if (!step) return;
      if (step.kind === 'hold') { tapMode(false); next(); return; }
      if (step.kind === 'measure') {
        if (measure.state === 'ready') { measure.state = 'running'; measure.t = 0; tapMode(true, 'Detener pausa de control'); }
        else if (measure.state === 'running') {
          const v = Math.round(measure.t);
          pauses.push(v);
          measure.state = 'shown';
          shownValue = 2.2;
          el.phase.textContent = `${v} segundos`;
          el.hint.textContent = 'Primera respiración pequeña. Recupera la calma.';
          tapMode(false);
        }
      }
    });
    el.pause.addEventListener('click', () => {
      paused = !paused;
      el.pause.innerHTML = icon(paused ? 'play' : 'pause', 26);
      el.pause.setAttribute('aria-label', paused ? 'Seguir' : 'Pausar');
      if (paused) el.phase.textContent = 'En pausa';
      audio.keepScreenOn();
    });
    el.air.addEventListener('click', () => { airLeft = 15; });
    root.querySelector('#dim').addEventListener('click', () => el.ses.classList.toggle('dim'));
    root.querySelector('#end').addEventListener('click', () => finish(false));
    root.querySelector('#close').addEventListener('click', () => finish(false));

    raf = requestAnimationFrame((ts) => { lastTs = ts; frame(ts); });
    return () => {
      if (!finished) {
        finished = true;
        cancelAnimationFrame(raf);
        audio.stopAll();
        audio.releaseScreen();
        delete document.body.dataset.session;
      }
    };
  },
};
