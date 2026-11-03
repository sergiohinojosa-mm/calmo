import { esc, icon, toast, dayKey, DIAS_L, askConfirm } from '../ui.js';
import { exercisesFor, nameFor, byId, DURATIONS } from '../catalog.js';

function presets(kind) {
  if (kind === 'peque') return [{ name: 'Antes de dormir', time: '20:00', exerciseId: 'flor', minutes: 1 }];
  if (kind === 'junior') {
    return [
      { name: 'Antes de dormir', time: '20:30', exerciseId: 'ligero', minutes: 5 },
      { name: 'Al despertar', time: '07:00', exerciseId: 'coherente', minutes: 5 },
    ];
  }
  return [
    { name: 'Al despertar', time: '05:30', exerciseId: 'coherente', minutes: 10 },
    { name: 'Antes de dormir', time: '21:00', exerciseId: '478', minutes: 5 },
  ];
}

const exOptions = (kind, selected) => exercisesFor(kind).filter((e) => e.mode !== 'serie')
  .map((e) => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(nameFor(e, kind))}</option>`).join('');

// Rutina que se está editando (#/planear?editar=<id>), de cualquier perfil.
function editing(ctx) {
  const id = ctx.query.get('editar');
  if (!id) return null;
  for (const p of ctx.store.profiles()) {
    const r = ctx.store.routines(p.id).find((x) => x.id === id);
    if (r) return r;
  }
  return null;
}

// Valores iniciales del formulario: los de la rutina editada o los de una nueva.
function initial(ctx, r) {
  const me = ctx.profile;
  const first = exercisesFor(me.kind).find((e) => e.mode !== 'serie');
  if (!r) return { profile: me.id, kind: 'sesion', exerciseId: first?.id, min: 10, time: '05:30', freq: 'daily', days: [], date: dayKey(), name: '' };
  return { profile: r.profile, kind: r.kind, exerciseId: r.exerciseId || first?.id, min: r.minutes || 10, time: r.time, freq: r.freq, days: [...(r.days || [])], date: r.date || dayKey(), name: r.name || '' };
}

export default {
  tab: 'calendario',
  render(ctx) {
    const { store } = ctx;
    const me = ctx.profile;
    const kind = me.kind;
    const adult = kind === 'adulto';
    const people = adult ? store.profiles() : [me];
    const r = editing(ctx);
    const v = initial(ctx, r);
    const formKind = store.profile(v.profile).kind;
    const mine = store.routines(me.id).filter((x) => x.active);
    const presetCards = presets(kind).map((p, i) => {
      const taken = mine.find((x) => x.time === p.time);
      if (taken) {
        return `<div class="card row" aria-disabled="true" style="opacity:.6">
          <span style="width:44px;height:44px;border-radius:14px;background:rgba(238,243,236,0.06);color:var(--text2);display:flex;align-items:center;justify-content:center;flex:none">${icon('check', 22)}</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(p.name)} · ${p.time}</span>
          <span class="muted">Ya tienes «${esc(taken.name)}» a las ${esc(taken.time)}</span></span></div>`;
      }
      return `<button class="card row" data-preset="${i}" style="text-align:left;width:100%;color:inherit;cursor:pointer">
          <span style="width:44px;height:44px;border-radius:14px;background:rgba(156,197,161,0.12);color:var(--hoja);display:flex;align-items:center;justify-content:center;flex:none">${icon(p.time < '12:00' ? 'sun' : 'moon', 22)}</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(p.name)} · ${p.time}</span>
          <span class="muted">Todos los días · ${esc(nameFor(byId(p.exerciseId), kind))} ${p.minutes} min</span></span>
          ${icon('plus', 20, 'style="color:var(--sage)"')}</button>`;
    }).join('');
    const saveLabel = r ? 'Guardar cambios' : v.freq === 'once' ? 'Guardar' : 'Guardar rutina';
    const back = r ? (ctx.query.get('de') === 'perfil' ? '#/perfil' : '#/calendario') : '#/calendario';
    return `<div class="top"><a class="icon-btn" href="${back}" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">${r ? 'Editar rutina' : 'Planear'}</h1></div>
      ${r ? '' : `<p class="label" style="margin-top:0">Rutinas rápidas · un toque y listo</p><div class="stack">${presetCards}</div>
      <p class="label">O arma la tuya</p>`}
      <form class="card stack" id="form" novalidate>
        ${adult ? `<label class="stack" style="gap:6px"><span class="muted">Para quién</span>
          <select class="field" name="profile">${people.map((p) => `<option value="${p.id}" ${p.id === v.profile ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>` : ''}
        <div class="stack" style="gap:6px"><span class="muted">Tipo</span>
          <div class="seg" role="group" aria-label="Tipo" id="kindSeg">
            <button type="button" data-kind="sesion" aria-pressed="${v.kind === 'sesion'}">Sesión</button>
            ${kind === 'peque' ? '' : `<button type="button" data-kind="bolt" aria-pressed="${v.kind === 'bolt'}">${adult ? 'Medir BOLT' : 'Reto del aire'}</button>`}
          </div></div>
        <div class="stack" style="gap:6px;${v.kind === 'bolt' ? 'display:none' : ''}" id="exRow"><label class="stack" style="gap:6px"><span class="muted">Ejercicio</span>
          <select class="field" name="exercise" id="exSel">${exOptions(formKind, v.exerciseId)}</select></label>
          <span class="muted" style="margin-top:6px">Minutos</span>
          <div class="pills" role="group" aria-label="Minutos" id="minPills">${DURATIONS.map((d) => `<button type="button" class="pill" data-min="${d}" aria-pressed="${d === v.min}">${d}</button>`).join('')}</div>
        </div>
        <label class="stack" style="gap:6px"><span class="muted">Hora</span><input class="field" type="time" name="time" value="${esc(v.time)}" required></label>
        <div class="stack" style="gap:6px"><span class="muted">Frecuencia</span>
          <div class="seg" role="group" aria-label="Frecuencia" id="freqSeg" style="grid-auto-columns:auto">
            <button type="button" data-freq="once" aria-pressed="${v.freq === 'once'}">Una vez</button>
            <button type="button" data-freq="daily" aria-pressed="${v.freq === 'daily'}">Diario</button>
            <button type="button" data-freq="weekdays" aria-pressed="${v.freq === 'weekdays'}">L a V</button>
            <button type="button" data-freq="days" aria-pressed="${v.freq === 'days'}">Días</button>
          </div>
          <input class="field" type="date" name="date" id="dateIn" value="${esc(v.date)}" style="${v.freq === 'once' ? '' : 'display:none'}" aria-label="Fecha">
          <div class="row" id="daysRow" style="display:${v.freq === 'days' ? 'flex' : 'none'};gap:6px;flex-wrap:wrap" role="group" aria-label="Días de la semana">
            ${DIAS_L.map((l, i) => `<button type="button" class="pill" data-day="${i}" aria-pressed="${v.days.includes(i)}" style="min-width:44px;padding:0">${l}</button>`).join('')}
          </div>
        </div>
        <label class="stack" style="gap:6px"><span class="muted">Nombre</span><input class="field" name="name" placeholder="Al despertar" maxlength="40" value="${esc(v.name)}"></label>
        <p id="err" role="alert" style="margin:0;color:var(--brasa);font-size:13px;min-height:18px"></p>
        <button class="btn primary block" type="submit" id="save">${saveLabel}</button>
        ${r ? '<button class="btn block" type="button" id="del" style="color:var(--brasa);border-color:rgba(233,178,125,0.35)">Borrar rutina</button>' : ''}
      </form>
      <p class="muted" style="margin-top:14px;text-align:center">Las notificaciones llegarán en una próxima versión; por ahora las verás en Inicio y Calendario.</p>`;
  },
  mount(root, ctx) {
    const { store, go } = ctx;
    const me = ctx.profile;
    const form = root.querySelector('#form');
    const r = editing(ctx);
    const v = initial(ctx, r);
    const state = { kind: v.kind, min: v.min, freq: v.freq, days: [...v.days] };
    const press = (group, attr, value) => group.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(value))));
    const back = () => go(ctx.query.get('de') === 'perfil' ? 'perfil' : 'calendario');

    root.querySelectorAll('[data-preset]').forEach((btn) => btn.addEventListener('click', () => {
      const p = presets(me.kind)[Number(btn.dataset.preset)];
      store.addRoutine({ profile: me.id, kind: 'sesion', freq: 'daily', days: [], ...p });
      toast(`Listo: ${p.name} todos los días a las ${p.time}`);
      go('calendario');
    }));

    const profileSel = form.querySelector('[name=profile]');
    profileSel?.addEventListener('change', () => {
      const kind = store.profile(profileSel.value).kind;
      form.querySelector('#exSel').innerHTML = exOptions(kind, form.querySelector('#exSel').value);
    });

    form.querySelector('#kindSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]');
      if (!b) return;
      state.kind = b.dataset.kind;
      press(form.querySelector('#kindSeg'), 'data-kind', state.kind);
      form.querySelector('#exRow').style.display = state.kind === 'bolt' ? 'none' : '';
    });
    form.querySelector('#minPills').addEventListener('click', (e) => {
      const b = e.target.closest('[data-min]');
      if (!b) return;
      state.min = Number(b.dataset.min);
      press(form.querySelector('#minPills'), 'data-min', state.min);
    });
    form.querySelector('#freqSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-freq]');
      if (!b) return;
      state.freq = b.dataset.freq;
      press(form.querySelector('#freqSeg'), 'data-freq', state.freq);
      form.querySelector('#dateIn').style.display = state.freq === 'once' ? '' : 'none';
      form.querySelector('#daysRow').style.display = state.freq === 'days' ? 'flex' : 'none';
      if (!r) form.querySelector('#save').textContent = state.freq === 'once' ? 'Guardar' : 'Guardar rutina';
    });
    form.querySelector('#daysRow').addEventListener('click', (e) => {
      const b = e.target.closest('[data-day]');
      if (!b) return;
      const d = Number(b.dataset.day);
      state.days = state.days.includes(d) ? state.days.filter((x) => x !== d) : [...state.days, d];
      b.setAttribute('aria-pressed', String(state.days.includes(d)));
    });
    form.addEventListener('input', () => { form.querySelector('#err').textContent = ''; });

    form.querySelector('#del')?.addEventListener('click', () => {
      askConfirm(`¿Borrar la rutina «${r.name}»?`, { ok: 'Borrar' }).then((ok) => {
        if (!ok) return;
        store.removeRoutine(r.id);
        toast('Rutina borrada');
        back();
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = form.querySelector('#err');
      const time = form.elements.namedItem('time').value;
      const date = form.elements.namedItem('date').value;
      if (!time) { err.textContent = 'Elige una hora.'; return; }
      if (state.freq === 'days' && !state.days.length) { err.textContent = 'Elige al menos un día.'; return; }
      if (state.freq === 'once' && !date) { err.textContent = 'Elige la fecha.'; return; }
      const profile = profileSel ? profileSel.value : me.id;
      const kid = store.profile(profile).kind !== 'adulto';
      const isBolt = state.kind === 'bolt';
      const fallback = isBolt ? (kid ? 'Reto del aire' : 'Medir BOLT') : (time < '12:00' ? 'Al despertar' : 'Antes de dormir');
      const data = {
        profile,
        kind: state.kind,
        name: form.elements.namedItem('name').value.trim() || fallback,
        exerciseId: isBolt ? null : form.elements.namedItem('exercise').value,
        minutes: isBolt ? 0 : state.min,
        time,
        freq: state.freq,
        days: state.freq === 'days' ? [...state.days].sort() : [],
        date: state.freq === 'once' ? date : undefined,
      };
      if (r) {
        store.updateRoutine(r.id, data);
        toast(`Cambios guardados: ${data.name} a las ${data.time}`);
        back();
        return;
      }
      const saved = store.addRoutine({ ...data, since: state.freq === 'once' && date < dayKey() ? date : dayKey() });
      toast(state.freq === 'once' ? `Guardado: ${saved.name} a las ${saved.time}` : `Rutina guardada: ${saved.name} a las ${saved.time}`);
      go('calendario');
    });
  },
};
