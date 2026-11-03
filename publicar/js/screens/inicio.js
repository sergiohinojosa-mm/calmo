import { esc, icon, longDate, moment, bar, avatar, minutesLabel } from '../ui.js';
import { heroSVG, theme } from '../hero.js';
import { byId, nameFor, QUICK, exercisesFor } from '../catalog.js';

const TIPS = [
  'Respira por la nariz también al caminar: tu BOLT lo agradece.',
  'Exhalar más largo que inhalar le dice a tu cuerpo que todo está bien.',
  'Mide tu BOLT al despertar, siempre en las mismas condiciones.',
  'Practica mejor con el estómago vacío, unas 2 horas después de comer.',
  'Evita los suspiros y bostezos grandes: respira ligero.',
  'Antes de una junta, 3 minutos de respiración cuadrada te enfocan.',
  'En la cama, la 4-7-8 ayuda a conciliar el sueño.',
];

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// La rutina pendiente que toca ahora: la próxima por venir o, si ya pasaron todas, la más reciente.
function nextPractice(store, p) {
  const items = store.agenda(p.id, new Date()).filter((i) => i.type === 'plan' && i.routine.kind === 'sesion');
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const open = items.filter((i) => i.status === 'pendiente');
  const upcoming = open.filter((i) => toMin(i.time) >= now - 30).sort((a, b) => toMin(a.time) - toMin(b.time));
  const past = open.filter((i) => toMin(i.time) < now - 30).sort((a, b) => toMin(b.time) - toMin(a.time));
  const pending = upcoming[0] || past[0];
  return { pending, done: items.filter((i) => i.status === 'hecha').length, total: items.length };
}

// En iPhone, invitar a agregar Calmo a la pantalla de inicio (no se pierden datos y abre en pantalla completa).
const INSTALL_KEY = 'calmo.instalar.oculto';
function installCard() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  let hidden = false;
  try { hidden = localStorage.getItem(INSTALL_KEY) === '1'; } catch (e) { /* sin almacenamiento */ }
  if (!ios || standalone || hidden || window.claude?.use) return '';
  return `<div class="card" id="install" style="border-color:rgba(226,204,148,0.35)">
    <div class="between"><p class="h3" style="margin:0">Agrega Calmo a tu inicio</p>
      <button class="icon-btn" data-install-close aria-label="Ocultar este aviso" style="background:transparent">${icon('x', 18)}</button></div>
    <p class="sub" style="margin-top:6px">Así abre en pantalla completa y tus datos no se borran.</p>
    <ol style="margin:10px 0 0;padding-left:20px;color:var(--text2);line-height:1.7;font-size:15px">
      <li>Toca <strong>Compartir</strong> (el cuadro con la flecha hacia arriba).</li>
      <li>Elige <strong>Agregar a inicio</strong> y toca <strong>Agregar</strong>.</li>
    </ol>
  </div>`;
}

function hero(p, kidLine = '') {
  const m = moment();
  const t = theme(m);
  return `<section class="hero">${heroSVG(m)}
    <div class="hello">
      <div>
        <p style="margin:0;font-size:13px;letter-spacing:.02em;color:${t.date}">${esc(longDate())}</p>
        <h1 class="h1" style="margin-top:6px;color:${t.title}">${t.greet},<br>${esc(p.name)}</h1>
        ${kidLine}
      </div>
      <a href="#/cambiar" class="row" style="flex-direction:column;gap:4px;text-decoration:none;color:${t.title}" aria-label="Cambiar de perfil">
        <span class="avatar" style="background:${t.avatarBg};color:${t.avatarFg}">${esc(p.name.charAt(0))}</span><span style="font-size:11px">Cambiar</span>
      </a>
    </div>
  </section>`;
}

function adult(ctx) {
  const { store } = ctx;
  const p = ctx.profile;
  const { pending, done, total } = nextPractice(store, p);
  const ex = pending ? pending.exercise : byId('coherente');
  const min = pending ? pending.minutes : 10;
  const g = store.goals(p.id);
  const lb = store.lastBolt(p.id);
  const week = store.last7(p.id);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const href = `#/configurar/${ex.id}?min=${min}${pending ? `&rutina=${pending.routine.id}` : ''}`;
  return `${hero(p)}
  <div class="after-hero stack">
    ${installCard()}
    <div class="card">
      <div class="between">
        ${pending ? `<span class="chip arena">${icon('repeat', 14)} ${esc(pending.title)} · ${esc(pending.time)}</span>` : '<span class="chip sage">Sugerida para hoy</span>'}
        ${total ? `<span class="muted">${done} de ${total} hoy</span>` : ''}
      </div>
      <h2 class="h2" style="margin-top:14px">${esc(ex.name)}</h2>
      <p class="sub">${min} min · ${esc(ex.pattern)} · por la nariz</p>
      <a class="btn primary block" style="margin-top:16px" href="${href}">${icon('play', 18)} Empezar</a>
    </div>
    <div class="grid3">
      <div class="tile">${icon('flame', 18, 'style="color:var(--brasa)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${store.streak(p.id)} <span style="font-family:var(--sans);font-size:13px;color:var(--text2)">${store.streak(p.id) === 1 ? "día" : "días"}</span></p><p class="muted" style="margin:2px 0 0">Días seguidos</p></div>
      <a class="tile" href="#/bolt" style="color:inherit;text-decoration:none">${icon('timer', 18, 'style="color:var(--sage)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${lb ? lb.seconds : '—'} <span style="font-family:var(--sans);font-size:13px;color:var(--text2)">s</span></p><div style="margin-top:6px">${bar(lb ? (lb.seconds / g.bolt) * 100 : 0)}</div><p class="muted" style="margin:6px 0 0">BOLT · meta ${g.bolt}</p></a>
      <a class="tile" href="#/progreso" style="color:inherit;text-decoration:none">${icon('leaf', 18, 'style="color:var(--hoja)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${Math.round(week)} <span style="font-family:var(--sans);font-size:13px;color:var(--text2)">min</span></p><p class="muted" style="margin:2px 0 0">7 días · meta ${g.weekly}</p></a>
    </div>
    <div class="between" style="margin-top:4px"><p style="margin:0;font-size:13px;color:var(--text2)">Para este momento</p><a href="#/catalogo" style="font-size:13px;font-weight:500;text-decoration:none;padding:10px 0">Ver todos</a></div>
    <div class="grid3">
      ${QUICK.map((q) => `<a class="tile" href="#/configurar/${q.id}" style="color:inherit;text-decoration:none;border:1px solid var(--line)">
        <span style="display:block;width:8px;height:8px;border-radius:50%;background:${q.color};margin-bottom:8px"></span>
        <span style="display:block;font-size:14px;font-weight:600">${q.label}</span>
        <span class="muted">${esc(byId(q.id).name)}</span></a>`).join('')}
    </div>
    <a class="tile row" href="#/consejos" style="color:inherit;text-decoration:none">${icon('sun', 20, 'style="color:var(--arena);flex:none"')}<span style="font-size:14px;line-height:1.45">${esc(tip)}</span></a>
  </div>`;
}

function junior(ctx) {
  const { store } = ctx;
  const p = ctx.profile;
  const lv = store.level(p.id);
  const { pending } = nextPractice(store, p);
  const ex = pending ? pending.exercise : byId('ligero');
  const min = pending ? pending.minutes : 5;
  const badges = store.badgeStatus(p.id);
  const earned = badges.filter((b) => b.earned).length;
  const next = badges.filter((b) => !b.earned).sort((a, b) => (b.current / b.target) - (a.current / a.target))[0];
  const levelLine = `<a href="#/logros" class="chip" style="margin-top:10px;text-decoration:none;background:rgba(16,26,21,0.62);color:#EEF3EC;min-height:32px">${icon('leaf', 14)} Nivel ${lv.name} · ${lv.next ? `te faltan ${lv.toNext} hojas` : 'nivel máximo'}</a>`;
  return `${hero(p, levelLine)}
  <div class="after-hero stack">
    ${installCard()}
    <div class="card">
      ${pending ? `<span class="chip arena">${icon('repeat', 14)} ${esc(pending.title)} · ${esc(pending.time)}</span>` : '<span class="chip sage">Para hoy</span>'}
      <h2 class="h2" style="margin-top:14px">${esc(nameFor(ex, 'junior'))}</h2>
      <p class="sub">${min} minutos · por la nariz · +${min + (pending ? 5 : 0)} hojas</p>
      <a class="btn primary block" data-audio style="margin-top:16px;min-height:60px;font-size:19px" href="#/sesion/${ex.id}?min=${min}">${icon('play', 20)} Empezar</a>
    </div>
    <div class="grid3">
      <div class="tile">${icon('flame', 18, 'style="color:var(--brasa)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${store.streak(p.id)}</p><p class="muted" style="margin:2px 0 0">Días seguidos</p></div>
      <div class="tile">${icon('leaf', 18, 'style="color:var(--hoja)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${lv.points}</p><p class="muted" style="margin:2px 0 0">Hojas</p></div>
      <a class="tile" href="#/logros" style="color:inherit;text-decoration:none">${icon('star', 18, 'style="color:var(--arena)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${earned}</p><p class="muted" style="margin:2px 0 0">Insignias</p></a>
    </div>
    ${next ? `<a class="card row" href="#/logros" style="color:inherit;text-decoration:none">
      <span style="width:48px;height:48px;border-radius:50%;background:rgba(226,204,148,0.14);color:var(--arena);display:flex;align-items:center;justify-content:center;flex:none">${icon('star', 24)}</span>
      <span style="flex:1"><span style="display:block;font-weight:600">Siguiente insignia: ${esc(next.name)}</span><span class="muted">${esc(next.kidDesc || next.desc)} · vas en ${next.current} de ${next.target}</span><span style="display:block;margin-top:8px">${bar((next.current / next.target) * 100, 'var(--arena)')}</span></span></a>` : ''}
    <a class="btn block" href="#/catalogo">Otros ejercicios</a>
  </div>`;
}

const PEQUE_ART = {
  flor: '<circle cx="35" cy="35" r="34" fill="#16231C"/><path d="M35 40v18" stroke="#6FA58A" stroke-width="3" stroke-linecap="round"/><circle cx="35" cy="26" r="7" fill="#E2CC94"/><g fill="#F0C4CB"><circle cx="35" cy="15" r="7"/><circle cx="46" cy="26" r="7"/><circle cx="35" cy="37" r="7"/><circle cx="24" cy="26" r="7"/></g><circle cx="35" cy="26" r="5" fill="#E2CC94"/>',
  vela: '<circle cx="35" cy="35" r="34" fill="#16231C"/><rect x="27" y="34" width="16" height="24" rx="3" fill="#E9DFC4"/><path d="M35 12 C 41 20, 42 25, 35 30 C 28 25, 29 20, 35 12Z" fill="#E9B27D"/><path d="M35 19 C 38 23, 38 26, 35 28 C 32 26, 32 23, 35 19Z" fill="#E2CC94"/>',
  raton: '<circle cx="35" cy="35" r="34" fill="#16231C"/><ellipse cx="37" cy="42" rx="17" ry="12" fill="#C9D6CB"/><circle cx="24" cy="30" r="7" fill="#C9D6CB"/><circle cx="24" cy="30" r="4" fill="#F0C4CB"/><circle cx="22" cy="40" r="2" fill="#1F2A23"/><path d="M54 44 q8 2 6 10" stroke="#C9D6CB" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
};

function peque(ctx) {
  const { store } = ctx;
  const p = ctx.profile;
  const days = store.practicedDays(p.id);
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const stars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return days.has(key);
  });
  const got = stars.filter(Boolean).length;
  return `<div style="padding-top:8px">
    <div class="between">
      <h1 class="h1" style="font-size:36px">Hola, ${esc(p.name)}</h1>
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><path d="M14 52 C 14 24, 36 10, 64 10 C 64 40, 48 62, 22 62 Z" fill="#9CC5A1"/><circle cx="34" cy="36" r="3" fill="#0F1A14"/><circle cx="48" cy="30" r="3" fill="#0F1A14"/><path d="M36 46 q7 5 13 -3" stroke="#0F1A14" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="28" cy="44" r="4" fill="#E9B27D" opacity=".7"/><circle cx="56" cy="38" r="4" fill="#E9B27D" opacity=".7"/></svg>
    </div>
    <p class="label" style="margin-top:14px">Tus estrellas de la semana · ${got}</p>
    <div class="row" style="gap:6px">${stars.map((s) => `<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z" fill="${s ? '#E2CC94' : 'none'}" stroke="${s ? '#E2CC94' : '#5E6E63'}" stroke-width="1.5"/></svg>`).join('')}</div>
    <div class="stack" style="margin-top:22px">
      ${exercisesFor('peque').map((e) => `<a data-audio href="#/sesion/${e.id}?min=${e.defaultMin}" class="card row" style="min-height:110px;color:inherit;text-decoration:none;gap:16px">
        <svg width="72" height="72" viewBox="0 0 70 70" aria-hidden="true">${PEQUE_ART[e.kidVisual]}</svg>
        <span style="flex:1"><span class="serif" style="display:block;font-size:24px">${esc(e.name)}</span><span class="sub" style="display:block">${e.defaultMin} ${e.defaultMin === 1 ? 'minuto' : 'minutos'}</span></span>
        ${icon('play', 26, 'style="color:var(--sage)"')}</a>`).join('')}
      <a href="#/bolt?peque=1" class="card row" style="min-height:110px;color:inherit;text-decoration:none;gap:16px">
        <span style="width:72px;height:72px;flex:none;border-radius:50%;background:#16231C;color:var(--arena);display:flex;align-items:center;justify-content:center">${icon('timer', 34)}</span>
        <span style="flex:1"><span class="serif" style="display:block;font-size:24px">Reto del aire</span><span class="sub" style="display:block">Con mamá o papá</span></span>
        ${icon('play', 26, 'style="color:var(--sage)"')}</a>
    </div>
    <a href="#/cambiar" class="btn block" style="margin-top:24px">${icon('lock', 18)} Volver a papá o mamá</a>
  </div>`;
}

export default {
  tab: 'inicio',
  render(ctx) {
    const kind = ctx.profile.kind;
    if (kind === 'peque') return peque(ctx);
    if (kind === 'junior') return junior(ctx);
    return adult(ctx);
  },
  mount(root) {
    root.querySelector('[data-install-close]')?.addEventListener('click', () => {
      try { localStorage.setItem(INSTALL_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
      root.querySelector('#install')?.remove();
    });
  },
};

export { PEQUE_ART, minutesLabel };
