import { esc, icon, bar, confetti, dayKey, plural } from '../ui.js';
import { byId, nameFor } from '../catalog.js';

function last() {
  try { return JSON.parse(sessionStorage.getItem('calmo.last') || 'null'); } catch (e) { return null; }
}

function medal(size = 120) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true" class="pop" style="margin:0 auto">
    <circle cx="60" cy="60" r="56" fill="#2A4033"/><circle cx="60" cy="60" r="46" fill="none" stroke="#E2CC94" stroke-width="3"/>
    <path d="M40 74c0-22 13-36 40-36 0 26-16 38-38 38" fill="#9CC5A1"/><path d="M40 74 60 56" stroke="#0F1A14" stroke-width="3" stroke-linecap="round"/></svg>`;
}

// Las hojas que ganó Peque, dibujadas una por una (hasta 10).
function leafRow(n) {
  return Array.from({ length: Math.min(n, 10) }, (_, i) => `<svg width="38" height="38" viewBox="0 0 24 24" class="pop" aria-hidden="true" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s">
    <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15z" fill="#9CC5A1"/><path d="M5 19 13 11" stroke="#0F1A14" stroke-width="1.6" stroke-linecap="round"/></svg>`).join('');
}

// «¿Cómo te sentiste?»: un solo toque, opcional. La maestra lo ve para ajustar la práctica.
const FEEL_OPTIONS = [['tranquilo', 'En calma'], ['bien', 'Bien'], ['costo', 'Me costó']];
function feelCard(store, p, r) {
  const s = store.sessions(p.id).find((x) => x.id === r.sessionId);
  if (!s) return '';
  const t = store.teacher();
  return `<div class="card" style="margin-top:18px" id="feel">
    <p style="margin:0;font-weight:600">¿Cómo te sentiste?</p>
    <div class="seg" role="group" aria-label="¿Cómo te sentiste?" style="margin-top:10px">
      ${FEEL_OPTIONS.map(([k, label]) => `<button type="button" data-feel="${k}" aria-pressed="${s.feel === k}">${label}</button>`).join('')}
    </div>
    <p class="muted" id="feelNote" style="margin:8px 0 0;font-size:12px">${s.feel ? '¡Gracias!' : t ? `Opcional. ${esc(t.name)} lo ve para ajustar tu práctica.` : 'Opcional.'}</p>
  </div>`;
}

export default {
  full: false,
  tab: false,
  render(ctx) {
    const { store } = ctx;
    const p = ctx.profile;
    const r = last();
    if (!r) return `<div class="stack" style="padding-top:40px"><h1 class="h1">Sin sesión reciente</h1><a class="btn primary" href="#/inicio">Ir a inicio</a></div>`;
    const ex = byId(r.exerciseId);
    const kind = p.kind;
    const kid = kind !== 'adulto';
    const lv = store.level(p.id);
    const earned = (r.newBadges || []).map((id) => store.BADGES.find((b) => b.id === id)).filter(Boolean);
    const leaves = r.minutePoints + r.plannedPoints + earned.length * 10;
    // Mismo redondeo que las hojas: 1 hoja por minuto completo (mínimo 1).
    const mins = Math.max(1, Math.floor(r.durationSec / 60));
    const g = store.goals(p.id);
    const week = store.last7(p.id);
    // Antes del 80 % la sesión se guarda pero no cumple la rutina: se celebra igual, sin decir «cumplida».
    const complete = r.complete !== false;
    const planned = Number(r.plannedMin) || 0;

    if (kind === 'peque') {
      // La estrella es una por día: si hoy ya había respirado, no se suma otra.
      const today = dayKey();
      const firstToday = !store.sessions(p.id).some((s) => s.day === today && s.id !== r.sessionId);
      return `<div style="text-align:center;padding-top:28px">
        <svg width="130" height="130" viewBox="0 0 24 24" class="pop" aria-hidden="true" style="margin:0 auto"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z" fill="#E2CC94"/></svg>
        <h1 class="h1" style="font-size:34px;margin-top:12px">¡Lo hiciste muy bien, ${esc(p.name)}!</h1>
        <p class="sub" style="font-size:18px">${firstToday ? '+1 estrella esta semana' : '¡Tu estrella de hoy brilla más!'}</p>
        <div class="card" style="margin-top:20px">
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${leafRow(leaves)}</div>
          <p class="serif" style="margin:8px 0 0;font-size:26px;color:var(--hoja)">+${plural(leaves, 'hoja', 'hojas')}</p>
        </div>
        ${earned.map((b) => `<div class="card" style="margin-top:12px;border-color:rgba(226,204,148,0.4)">
          ${medal(96)}
          <p class="serif" style="margin:10px 0 0;font-size:24px;color:var(--arena)">¡Nueva insignia!</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:600">${esc(b.name)}</p>
          ${b.kidDesc ? `<p class="sub" style="font-size:16px">${esc(b.kidDesc)}</p>` : ''}</div>`).join('')}
        <a class="btn primary block" href="#/inicio" style="margin-top:24px;min-height:64px;font-size:20px">¡Listo!</a>
      </div>`;
    }

    const title = complete ? `¡Lo lograste, ${esc(p.name)}!` : `¡Bien, ${esc(p.name)}!`;
    const exName = ex ? esc(nameFor(ex, kind)) : '';
    const nextTime = planned > mins ? `La próxima vamos por los&nbsp;${planned}.` : 'La próxima vamos por todo el ejercicio.';
    const pauses = r.controlPauses || [];
    const gain = pauses.length > 1 ? pauses.at(-1) - pauses[0] : 0;
    // A niñas y niños solo se les dice cuando mejoraron.
    const gainText = pauses.length < 2 ? '' : kid ? (gain > 0 ? `¡${gain} s más que al principio!` : '') : `${gain >= 0 ? '+' : ''}${gain} s en esta sesión`;
    return `<div style="text-align:center;padding-top:20px">
      ${earned.length ? medal(130) : `<svg width="110" height="110" viewBox="0 0 110 110" class="pop" aria-hidden="true" style="margin:0 auto"><circle cx="55" cy="55" r="50" fill="#1C2B23"/><circle cx="55" cy="55" r="34" fill="#9CC5A1" opacity=".25"/><path d="M36 58l13 13 26-28" fill="none" stroke="#B9DEC3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
      <h1 class="h1" style="margin-top:16px">${title}</h1>
      ${complete
        ? `<p class="sub">${exName} · ${mins} min${r.routineName ? ` · ${esc(r.routineName)} cumplida` : ''}</p>`
        : `<p class="sub">${exName}</p><p style="margin:8px 0 0;font-size:17px;line-height:1.45">Hoy hiciste ${mins} min. ${nextTime}</p>`}
    </div>
    ${feelCard(store, p, r)}
    ${earned.map((b) => `<div class="card" style="margin-top:18px;text-align:center;border-color:rgba(226,204,148,0.4)">
      <span class="chip arena">${icon('star', 14)} ¡Nueva insignia!</span>
      <p class="h2" style="margin-top:10px">${esc(b.name)}</p><p class="sub">${esc(kid ? (b.kidDesc || b.desc) : b.desc)}</p></div>`).join('')}
    <div class="card" style="margin-top:18px">
      <span class="row" style="gap:8px;font-size:20px;font-weight:600;color:var(--hoja)">${icon('leaf', 22)} +${leaves} ${leaves === 1 ? "hoja" : "hojas"}</span><p class="muted" style="margin:4px 0 0">+${r.minutePoints} por tiempo${r.plannedPoints ? ` · +${r.plannedPoints} rutina` : ''}${earned.length ? ` · +${earned.length * 10} insignia` : ''}</p>
      <div style="margin-top:14px">${bar(lv.pct)}</div>
      <p class="muted" style="margin:8px 0 0">Nivel ${esc(lv.name)} · ${lv.points} ${lv.points === 1 ? "hoja" : "hojas"}${lv.next ? (kid ? ` · ${lv.toNext} más y llegas a ${esc(lv.next.name)}` : ` · te faltan ${lv.toNext} para ${esc(lv.next.name)}`) : ''}</p>
    </div>
    ${pauses.length ? `<div class="card" style="margin-top:12px"><h2 class="h3">${kid ? 'Tus retos del aire' : 'Pausas de control'}</h2>
      <div class="row" style="align-items:flex-end;gap:10px;height:90px;margin-top:12px">${pauses.map((v, i) => `<div style="flex:1;text-align:center"><span class="muted">${v} s</span><div style="height:${Math.max(8, (v / Math.max(...pauses)) * 60)}px;border-radius:8px;background:${i === pauses.length - 1 ? 'var(--sage)' : 'rgba(156,197,161,0.4)'};margin-top:4px"></div></div>`).join('')}</div>
      ${gainText ? `<p class="sub">${gainText}</p>` : ''}</div>` : ''}
    <div class="grid2" style="margin-top:12px">
      <div class="tile">${icon('flame', 18, 'style="color:var(--brasa)"')}<p class="num" style="margin:6px 0 0;font-size:26px">${store.streak(p.id)}</p><p class="muted" style="margin:2px 0 0">Días seguidos</p></div>
      <div class="tile">${icon('chart', 18, 'style="color:var(--sage)"')}<p class="num" style="margin:6px 0 0;font-size:26px">${Math.round(week)}<span style="font-size:14px;color:var(--text2)"> / ${g.weekly}</span></p><p class="muted" style="margin:2px 0 0">Minutos en 7 días</p></div>
    </div>
    <div class="stack" style="margin-top:22px">
      <a class="btn primary block" href="#/inicio">Listo</a>
      <a class="btn block" href="#/logros">Ver mis logros</a>
    </div>`;
  },
  mount(root, ctx) {
    confetti();
    root.querySelector('#feel')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-feel]');
      if (!b) return;
      ctx.store.setSessionFeel(last().sessionId, b.dataset.feel);
      root.querySelectorAll('[data-feel]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      root.querySelector('#feelNote').textContent = '¡Gracias!';
    });
    // Peque escucha la felicitación con la misma voz genérica de la sesión, una sola vez por sesión.
    const r = last();
    const p = ctx && ctx.profile;
    if (!r || !p || p.kind !== 'peque' || !('speechSynthesis' in window)) return null;
    try {
      if (sessionStorage.getItem('calmo.spoken') === String(r.sessionId)) return null;
      sessionStorage.setItem('calmo.spoken', String(r.sessionId));
    } catch (e) { /* sin sessionStorage */ }
    const t = setTimeout(() => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`¡Lo hiciste muy bien, ${p.name}!`);
        u.lang = 'es-MX';
        u.rate = 0.85;
        u.pitch = 1.1;
        speechSynthesis.speak(u);
      } catch (e) { /* sin voz */ }
    }, 400);
    return () => clearTimeout(t);
  },
};
