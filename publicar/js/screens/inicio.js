import { esc, icon, longDate, moment, bar, avatar, minutesLabel, toast } from '../ui.js';
import { heroSVG, theme } from '../hero.js';
import { byId, nameFor, QUICK, exercisesFor, boltPlan } from '../catalog.js';

const TIPS = [
  'Respira por la nariz también al caminar: tu BOLT lo agradece.',
  'Exhalar más largo que inhalar le dice a tu cuerpo que todo está bien.',
  'Mide tu BOLT al despertar, siempre en las mismas condiciones.',
  'Practica mejor con el estómago vacío, unas 2 horas después de comer.',
  'En el día, evita los suspiros y bostezos grandes: respira ligero.',
  'Respira con el diafragma y deja los hombros relajados.',
  'Antes de una junta, 3 minutos de respiración cuadrada te enfocan.',
  'En la cama, la 4-7-8 ayuda a conciliar el sueño.',
];

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// La rutina pendiente que toca ahora: la próxima por venir o, si ya pasaron todas, la más reciente.
function nextPractice(store, p) {
  // Una rutina con un ejercicio que esta versión no conoce no se ofrece.
  const items = store.agenda(p.id, new Date()).filter((i) => i.type === 'plan' && i.routine.kind === 'sesion' && i.exercise);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const open = items.filter((i) => i.status === 'pendiente');
  const upcoming = open.filter((i) => toMin(i.time) >= now - 30).sort((a, b) => toMin(a.time) - toMin(b.time));
  const past = open.filter((i) => toMin(i.time) < now - 30).sort((a, b) => toMin(b.time) - toMin(a.time));
  const pending = upcoming[0] || past[0];
  return { pending, done: items.filter((i) => i.status === 'hecha').length, total: items.length };
}

// Notas de la maestra sin leer: las del perfil y, para un adulto, las de Peque (que no lee).
// Al marcarla como leída se quita de Inicio; se sigue viendo en Mensajes.
function teacherNotes(store, p) {
  const adult = p.kind === 'adulto';
  const mine = store.unreadNotes(p.id).map((n) => ({ n, who: null }));
  const peque = adult ? store.familyMembers().filter((x) => x.kind === 'peque').flatMap((x) => store.unreadNotes(x.id).map((n) => ({ n, who: x }))) : [];
  return [...mine, ...peque].slice(0, 3).map(({ n, who }) => `<div class="card" style="border-color:rgba(185,222,195,0.35)">
      <div class="between" style="align-items:flex-start;gap:8px">
        <span class="chip sage">${icon('leaf', 14)} ${who ? `Nota para ${esc(who.name)}` : `${esc(store.teacherName(n.by))} te dejó una nota`}</span>
        <button class="icon-btn" data-note-read="${esc(n.id)}" aria-label="Quitar de Inicio" style="background:transparent;color:var(--muted);margin:-8px -8px 0 0">${icon('x', 18)}</button>
      </div>
      <p style="margin:10px 0 0;font-size:16px;line-height:1.45">${esc(n.text)}</p>
      <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn small" data-note-read="${esc(n.id)}">${icon('check', 16)} ${adult ? 'Marcar como leída' : 'Ya la leí'}</button>
        ${!who ? `<a class="btn small" href="#/mensajes?responder=1">${icon('msg', 16)} Responder</a>` : ''}
      </div>
    </div>`).join('');
}

// Las rutinas de hoy (sesiones y BOLT) en orden, y cuál toca ahora.
function todayPlan(store, p) {
  const items = store.agenda(p.id, new Date()).filter((i) => i.type === 'plan' && (i.routine.kind === 'bolt' || i.exercise));
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const open = items.filter((i) => i.status === 'pendiente');
  const upcoming = open.filter((i) => toMin(i.time) >= now - 30).sort((a, b) => toMin(a.time) - toMin(b.time));
  const past = open.filter((i) => toMin(i.time) < now - 30).sort((a, b) => toMin(b.time) - toMin(a.time));
  const current = upcoming[0] || past[0];
  return { items, start: current ? items.indexOf(current) : 0, done: items.filter((i) => i.status === 'hecha').length };
}

// Una tarjeta por rutina de hoy. Se desliza a la izquierda o a la derecha.
function planCarousel(store, p, kind) {
  const { items, start, done } = todayPlan(store, p);
  if (!items.length) return '';
  const kid = kind !== 'adulto';
  const slides = items.map((it, i) => {
    const isBolt = it.routine.kind === 'bolt';
    const ex = it.exercise;
    const min = it.minutes || (ex && ex.defaultMin) || 5;
    // Las niñas van directo a la sesión; los adultos pasan por la pantalla de ajustes.
    // Las niñas no eligen: si falta mucho para su hora, la sesión cuenta como extra.
    const counts = !(kid && store.tooEarlyFor(it.routine));
    const href = isBolt ? `#/bolt?rutina=${it.routine.id}` : `#/${kid ? 'sesion' : 'configurar'}/${ex.id}?min=${min}${counts ? `&rutina=${it.routine.id}` : ''}`;
    const name = isBolt ? (kid ? 'Reto del aire' : 'Medir BOLT') : nameFor(ex, kind);
    const detail = isBolt ? (kid ? 'Toca en cuanto sientas ganas de respirar' : 'Al despertar es el más confiable') : `${min} min · ${esc(kid ? (ex.kidPattern || ex.pattern) : ex.pattern)} · por la nariz${kid ? ` · +${min + 5} hojas` : ''}`;
    const isDone = it.status === 'hecha';
    const asked = store.assignedBy(it.routine);
    return `<div class="card slide" role="group" aria-roledescription="rutina" aria-label="${i + 1} de ${items.length}: ${esc(it.title)} ${esc(it.time)}">
      <div class="between">
        <span class="chip ${asked ? 'sage' : 'arena'}">${icon(isBolt ? 'timer' : 'repeat', 14)} ${esc(it.title)} · ${esc(it.time)}</span>
        ${isDone ? `<span class="row" style="gap:4px;color:var(--hoja);font-size:13px">${icon('check', 15)} Hecha</span>` : `<span class="muted">${i + 1} de ${items.length}</span>`}
      </div>
      ${asked ? `<p class="row" style="gap:6px;margin:12px 0 0;color:var(--hoja);font-size:14px;font-weight:600">${icon('leaf', 15)} ${esc(asked)} lo pidió${it.routine.week ? ` · semana ${it.routine.week} de ${it.routine.weeks}` : ''}</p>` : ''}
      <h2 class="h2" style="margin-top:${asked ? 6 : 14}px">${esc(name)}</h2>
      <p class="sub">${detail}</p>
      <a class="btn ${isDone ? '' : 'primary'} block" ${isBolt ? '' : 'data-audio'} style="margin-top:16px${kid && !isDone ? ';min-height:60px;font-size:19px' : ''}" href="${href}">${icon(isDone ? 'repeat' : 'play', 18)} ${isDone ? 'Hacer otra vez' : 'Empezar'}</a>
    </div>`;
  }).join('');
  const dots = items.length > 1 ? `<div class="car-dots" role="group" aria-label="Rutinas de hoy">${items.map((it, i) => `<button type="button" data-slide="${i}" aria-label="Ver ${esc(it.title)} ${esc(it.time)}" aria-current="${i === start}"><i></i></button>`).join('')}</div>` : '';
  return `<div><div class="carousel" id="plan" data-start="${start}">${slides}</div>
    ${dots}<p class="muted" style="margin:4px 0 0;text-align:center">${done} de ${items.length} hechas hoy${items.length > 1 ? ' · desliza para ver las demás' : ''}</p></div>`;
}

// Atajo a «Tu plan» (en Progreso): qué conviene practicar según el BOLT de la mañana.
function planRow(store, p) {
  const b = store.planBolt(p.id);
  if (!b) return '';
  const plan = boltPlan(b.seconds);
  return `<a class="tile row" href="#/progreso?plan=1" style="color:inherit;text-decoration:none;border:1px solid rgba(185,222,195,0.25)">
    ${icon('leaf', 20, 'style="color:var(--hoja);flex:none"')}
    <span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:14px">Tu plan: ${esc(plan.title)}</span>
      <span class="muted">${esc(plan.items.map((it) => nameFor(byId(it.id), 'adulto')).join(' · '))}</span></span>
    ${icon('chev', 18, 'style="color:var(--muted)"')}</a>`;
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
    <div class="between"><h2 class="h3" style="margin:0">Agrega Calmo a tu inicio</h2>
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
  const { pending } = nextPractice(store, p);
  const ex = pending ? pending.exercise : byId('coherente');
  const min = pending ? pending.minutes : 10;
  const g = store.goals(p.id);
  const lb = store.lastBolt(p.id);
  const week = store.last7(p.id);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const href = `#/configurar/${ex.id}?min=${min}${pending ? `&rutina=${pending.routine.id}` : ''}`;
  const asks = store.pendingRedemptions().length;
  const suggested = `<div class="card">
      <span class="chip sage">Sugerida para hoy</span>
      <h2 class="h2" style="margin-top:14px">${esc(ex.name)}</h2>
      <p class="sub">${min} min · ${esc(ex.pattern)} · por la nariz</p>
      <a class="btn primary block" style="margin-top:16px" href="${href}">${icon('play', 18)} Empezar</a>
    </div>`;
  return `${hero(p)}
  <div class="after-hero stack">
    ${installCard()}
    ${teacherNotes(store, p)}
    ${planCarousel(store, p, 'adulto') || suggested}
    ${planRow(store, p)}
    ${asks ? `<a class="card row" href="#/premiosadmin" style="color:inherit;text-decoration:none;border:1px solid rgba(226,204,148,0.35)">${icon('gift', 22, 'style="color:var(--arena);flex:none"')}
      <span style="flex:1;font-weight:600">${asks === 1 ? '1 premio por aprobar' : `${asks} premios por aprobar`}</span>${icon('chev', 18, 'style="color:var(--muted)"')}</a>` : ''}
    <div class="grid3">
      <div class="tile">${icon('flame', 18, 'style="color:var(--brasa)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${store.streak(p.id)} <span style="font-family:var(--sans);font-size:13px;color:var(--text2)">${store.streak(p.id) === 1 ? "día" : "días"}</span></p><p class="muted" style="margin:2px 0 0">Días seguidos</p></div>
      <a class="tile" href="#/bolt" style="color:inherit;text-decoration:none">${icon('timer', 18, 'style="color:var(--sage)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${lb ? lb.seconds : '—'} <span style="font-family:var(--sans);font-size:13px;color:var(--text2)">s</span></p><div style="margin-top:6px">${bar(lb ? (lb.seconds / g.bolt) * 100 : 0)}</div><p class="muted" style="margin:6px 0 0">BOLT · meta ${g.bolt}</p></a>
      <a class="tile" href="#/progreso" style="color:inherit;text-decoration:none">${icon('leaf', 18, 'style="color:var(--hoja)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${Math.round(week)} <span style="font-family:var(--sans);font-size:13px;color:var(--text2)">min</span></p><p class="muted" style="margin:2px 0 0">7 días · meta ${g.weekly}</p></a>
    </div>
    <div class="between" style="margin-top:4px"><p style="margin:0;font-size:13px;color:var(--text2)">Para este momento</p><a href="#/catalogo" style="font-size:13px;font-weight:500;text-decoration:none;padding:10px 0">Ver todos</a></div>
    <div class="grid3">
      ${QUICK.map((q) => `<a class="tile" href="#/configurar/${q.id}" style="color:inherit;text-decoration:none;border:1px solid var(--line)">
        <span style="display:block;width:8px;height:8px;border-radius:50%;background:${q.color};margin-bottom:8px"></span>
        <span style="display:block;font-size:clamp(12px, 3.8vw, 14px);font-weight:600">${q.label}</span>
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
    ${teacherNotes(store, p)}
    ${planCarousel(store, p, 'junior') || `<div class="card">
      <span class="chip sage">Para hoy</span>
      <h2 class="h2" style="margin-top:14px">${esc(nameFor(ex, 'junior'))}</h2>
      <p class="sub">${min} minutos · por la nariz · +${min} hojas</p>
      <a class="btn primary block" data-audio style="margin-top:16px;min-height:60px;font-size:19px" href="#/sesion/${ex.id}?min=${min}">${icon('play', 20)} Empezar</a>
    </div>`}
    <div class="grid3">
      <div class="tile">${icon('flame', 18, 'style="color:var(--brasa)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${store.streak(p.id)}</p><p class="muted" style="margin:2px 0 0">Días seguidos</p></div>
      <div class="tile">${icon('leaf', 18, 'style="color:var(--hoja)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${lv.points}</p><p class="muted" style="margin:2px 0 0">Hojas ganadas</p></div>
      <a class="tile" href="#/logros" style="color:inherit;text-decoration:none">${icon('star', 18, 'style="color:var(--arena)"')}<p class="num" style="margin:6px 0 0;font-size:24px">${earned}</p><p class="muted" style="margin:2px 0 0">Insignias</p></a>
    </div>
    ${next ? `<a class="card row" href="#/logros" style="color:inherit;text-decoration:none">
      <span style="width:48px;height:48px;border-radius:50%;background:rgba(226,204,148,0.14);color:var(--arena);display:flex;align-items:center;justify-content:center;flex:none">${icon('star', 24)}</span>
      <span style="flex:1"><span style="display:block;font-weight:600">Siguiente insignia: ${esc(next.name)}</span><span class="muted">${esc(next.kidDesc || next.desc)} · vas en ${next.current} de ${next.target}</span><span style="display:block;margin-top:8px">${bar((next.current / next.target) * 100, 'var(--arena)')}</span></span></a>` : ''}
    <a class="card row" href="#/premios" style="color:inherit;text-decoration:none">${icon('gift', 24, 'style="color:var(--arena);flex:none"')}
      <span style="flex:1"><span style="display:block;font-weight:600">Mis premios</span><span class="muted">${store.rewardBalance(p.id)} hojas para cambiar</span></span>${icon('chev', 18, 'style="color:var(--muted)"')}</a>
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
      <a href="#/perfil" aria-label="Mi perfil" style="display:block;border-radius:50%"><svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><path d="M14 52 C 14 24, 36 10, 64 10 C 64 40, 48 62, 22 62 Z" fill="#9CC5A1"/><circle cx="34" cy="36" r="3" fill="#0F1A14"/><circle cx="48" cy="30" r="3" fill="#0F1A14"/><path d="M36 46 q7 5 13 -3" stroke="#0F1A14" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="28" cy="44" r="4" fill="#E9B27D" opacity=".7"/><circle cx="56" cy="38" r="4" fill="#E9B27D" opacity=".7"/></svg></a>
    </div>
    <p class="label" style="margin-top:14px">Tus estrellas de la semana · ${got}</p>
    <div class="row" style="gap:4px;justify-content:space-between">${stars.map((s, i) => `<span role="img" aria-label="${['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][i]}: ${s ? 'con estrella' : 'sin estrella'}" style="display:flex;flex-direction:column;align-items:center;gap:2px"><svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z" fill="${s ? '#E2CC94' : 'none'}" stroke="${s ? '#E2CC94' : '#5E6E63'}" stroke-width="1.5"/></svg><span class="muted" style="font-size:12px">${'LMXJVSD'[i]}</span></span>`).join('')}</div>
    <div class="stack" style="margin-top:22px">
      ${exercisesFor('peque').map((e) => `<a data-audio href="#/sesion/${e.id}?min=${e.defaultMin}" class="card row" style="min-height:110px;color:inherit;text-decoration:none;gap:16px">
        <svg width="72" height="72" viewBox="0 0 70 70" aria-hidden="true">${PEQUE_ART[e.kidVisual]}</svg>
        <span style="flex:1"><span class="serif" style="display:block;font-size:24px">${esc(e.name)}</span><span class="sub" style="display:block">${e.defaultMin} ${e.defaultMin === 1 ? 'minuto' : 'minutos'}</span></span>
        ${icon('play', 26, 'style="color:var(--sage)"')}</a>`).join('')}
      <a href="#/bolt?peque=1" class="card row" style="min-height:110px;color:inherit;text-decoration:none;gap:16px">
        <span style="width:72px;height:72px;flex:none;border-radius:50%;background:#16231C;color:var(--arena);display:flex;align-items:center;justify-content:center">${icon('timer', 34)}</span>
        <span style="flex:1"><span class="serif" style="display:block;font-size:24px">Reto del aire</span><span class="sub" style="display:block">Con mamá o papá</span></span>
        ${icon('play', 26, 'style="color:var(--sage)"')}</a>
      <a href="#/premios" class="card row" style="min-height:110px;color:inherit;text-decoration:none;gap:16px">
        <span style="width:72px;height:72px;flex:none;border-radius:50%;background:#16231C;color:var(--arena);display:flex;align-items:center;justify-content:center">${icon('gift', 34)}</span>
        <span style="flex:1"><span class="serif" style="display:block;font-size:24px">Mis premios</span><span class="sub" style="display:block">${store.rewardBalance(p.id)} hojas</span></span>
        ${icon('chev', 26, 'style="color:var(--sage)"')}</a>
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
  mount(root, ctx) {
    // «Leída» en una nota de la maestra.
    const onClick = (e) => {
      const read = e.target.closest('[data-note-read]');
      if (read) {
        const own = ctx.store.notes(ctx.profile.id).some((n) => n.id === read.dataset.noteRead);
        ctx.store.markNoteRead(read.dataset.noteRead);
        if (own) toast(ctx.profile.kind === 'adulto' ? 'Listo. La encuentras en Mi perfil → Mensajes' : '¡Listo! La encuentras en Mi perfil → Mensajes');
        ctx.rerender();
      }
    };
    root.addEventListener('click', onClick);
    const car = root.querySelector('#plan');
    if (car) {
      const slides = [...car.children];
      const dots = [...root.querySelectorAll('[data-slide]')];
      const at = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
      car.scrollLeft = at(Number(car.dataset.start) || 0);
      let raf = 0;
      car.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const i = slides.reduce((best, _, k) => (Math.abs(at(k) - car.scrollLeft) < Math.abs(at(best) - car.scrollLeft) ? k : best), 0);
          dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
        });
      }, { passive: true });
      dots.forEach((d) => d.addEventListener('click', () => car.scrollTo({ left: at(Number(d.dataset.slide)), behavior: 'smooth' })));
    }
    root.querySelector('[data-install-close]')?.addEventListener('click', () => {
      try { localStorage.setItem(INSTALL_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
      root.querySelector('#install')?.remove();
    });
    return () => root.removeEventListener('click', onClick);
  },
};

export { PEQUE_ART, minutesLabel };
