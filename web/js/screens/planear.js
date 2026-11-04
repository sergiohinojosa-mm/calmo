import { esc, icon, toast, dayKey, DIAS_L, askConfirm } from '../ui.js';
import { exercisesFor, nameFor, byId } from '../catalog.js';

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
    { name: 'Antes de dormir', time: '21:00', exerciseId: '478', minutes: 1 },
  ];
}

const exOptions = (kind, selected) => exercisesFor(kind).filter((e) => e.mode !== 'serie')
  .map((e) => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(nameFor(e, kind))}</option>`).join('');

// Minutos que se ofrecen según la edad, sin pasar del máximo del ejercicio.
const MINUTES = { peque: [1, 2, 3], junior: [3, 5, 10], adulto: [3, 5, 10, 15, 25] };

function durationsFor(kind, ex, keep) {
  const all = MINUTES[kind] || MINUTES.adulto;
  let list = ex?.maxMin ? all.filter((d) => d <= ex.maxMin) : all;
  if (!list.length) list = [ex.maxMin];
  // Al editar se conserva el valor guardado aunque no esté en la lista.
  if (keep && !list.includes(keep) && (!ex?.maxMin || keep <= ex.maxMin)) list = [...list, keep].sort((a, b) => a - b);
  return list;
}

const defaultMin = (kind, ex) => (kind === 'adulto' ? ex?.defaultMin : (ex?.juniorMin ?? ex?.defaultMin));

// El valor de la lista más cercano al que se pide.
function nearest(list, wanted) {
  if (!wanted) return list[0];
  return list.reduce((a, d) => (Math.abs(d - wanted) < Math.abs(a - wanted) ? d : a), list[0]);
}

const minPills = (list, min) => list.map((d) => `<button type="button" class="pill" data-min="${d}" aria-pressed="${d === min}">${d}</button>`).join('');

// Rutina que se está editando (#/planear?editar=<id>), de un perfil que esta persona cuida.
function editing(ctx) {
  const id = ctx.query.get('editar');
  if (!id) return null;
  for (const p of ctx.store.profiles()) {
    if (!ctx.store.canManage(ctx.profile.id, p.id)) continue;
    const r = ctx.store.routines(p.id).find((x) => x.id === id);
    if (r) return r;
  }
  return null;
}

// Valores iniciales del formulario: los de la rutina editada o los de una nueva
// (para el perfil de ?p=<id> si viene del calendario de alguien más).
function initial(ctx, r) {
  const { store, query } = ctx;
  const me = ctx.profile;
  const asked = query.get('p');
  const profile = r ? r.profile : (asked && store.canManage(me.id, asked) ? asked : me.id);
  const kind = store.profile(profile).kind;
  const first = exercisesFor(kind).find((e) => e.mode !== 'serie');
  if (!r) {
    const min = nearest(durationsFor(kind, first), defaultMin(kind, first));
    return { profile, kind: 'sesion', exerciseId: first?.id, min, time: '05:30', freq: 'daily', days: [], date: dayKey(), name: '' };
  }
  const ex = byId(r.exerciseId) || first;
  return { profile, kind: r.kind, exerciseId: ex?.id, min: r.minutes || nearest(durationsFor(kind, ex), defaultMin(kind, ex)), time: r.time, freq: r.freq, days: [...(r.days || [])], date: r.date || dayKey(), name: r.name || '' };
}

// Rutinas rápidas para el perfil elegido en "Para quién".
function presetCards(store, profileId, meId) {
  const target = store.profile(profileId);
  const kind = target.kind;
  const theirs = store.routines(profileId).filter((x) => x.active !== false);
  return presets(kind).map((p, i) => {
    const taken = theirs.find((x) => x.time === p.time);
    if (taken) {
      return `<div class="card row" aria-disabled="true" style="opacity:.6">
          <span style="width:44px;height:44px;border-radius:14px;background:rgba(238,243,236,0.06);color:var(--text2);display:flex;align-items:center;justify-content:center;flex:none">${icon('check', 22)}</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(p.name)} · ${p.time}</span>
          <span class="muted">${profileId === meId ? 'Ya tienes' : `${esc(target.name)} ya tiene`} «${esc(taken.name)}» a las ${esc(taken.time)}</span></span></div>`;
    }
    return `<button class="card row" data-preset="${i}" style="text-align:left;width:100%;color:inherit;cursor:pointer">
          <span style="width:44px;height:44px;border-radius:14px;background:rgba(156,197,161,0.12);color:var(--hoja);display:flex;align-items:center;justify-content:center;flex:none">${icon(p.time < '12:00' ? 'sun' : 'moon', 22)}</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(p.name)} · ${p.time}</span>
          <span class="muted">Todos los días · ${esc(nameFor(byId(p.exerciseId), kind))} ${p.minutes} min</span></span>
          ${icon('plus', 20, 'style="color:var(--sage)"')}</button>`;
  }).join('');
}

// A dónde regresar: al perfil si se abrió desde ahí; si no, al calendario de esa persona.
const calendarOf = (ctx, id) => (id && id !== ctx.profile.id ? `calendario?p=${encodeURIComponent(id)}` : 'calendario');
const backTo = (ctx) => {
  const de = ctx.query.get('de');
  if (de === 'alumno' && ctx.query.get('p')) return `alumno/${encodeURIComponent(ctx.query.get('p'))}`;
  return ['perfil', 'familia'].includes(de) ? de : calendarOf(ctx, ctx.query.get('p'));
};

export default {
  tab: 'calendario',
  render(ctx) {
    const { store } = ctx;
    const me = ctx.profile;
    const adult = me.kind === 'adulto';
    const people = store.profiles().filter((p) => store.canManage(me.id, p.id));
    const r = editing(ctx);
    const v = initial(ctx, r);
    const formKind = store.profile(v.profile).kind;
    const ex = byId(v.exerciseId);
    const saveLabel = r ? 'Guardar cambios' : v.freq === 'once' ? 'Guardar' : 'Guardar rutina';
    return `<div class="top"><a class="icon-btn" href="#/${backTo(ctx)}" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">${r ? 'Editar rutina' : 'Planear'}</h1></div>
      ${r ? '' : `<p class="label" style="margin-top:0">Rutinas rápidas · un toque y listo</p><div class="stack" id="presets">${presetCards(store, v.profile, me.id)}</div>
      <p class="label">O arma la tuya</p>`}
      <form class="card stack" id="form" novalidate>
        ${adult ? `<label class="stack" style="gap:6px"><span class="muted">Para quién</span>
          <select class="field" name="profile">${people.map((p) => `<option value="${p.id}" ${p.id === v.profile ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>` : ''}
        <div class="stack" style="gap:6px"><span class="muted">Tipo</span>
          <div class="seg" role="group" aria-label="Tipo" id="kindSeg">
            <button type="button" data-kind="sesion" aria-pressed="${v.kind === 'sesion'}">Sesión</button>
            <button type="button" data-kind="bolt" aria-pressed="${v.kind === 'bolt'}" style="${formKind === 'peque' ? 'display:none' : ''}">${formKind === 'adulto' ? 'Medir BOLT' : 'Reto del aire'}</button>
          </div></div>
        <div class="stack" style="gap:6px;${v.kind === 'bolt' ? 'display:none' : ''}" id="exRow"><label class="stack" style="gap:6px"><span class="muted">Ejercicio</span>
          <select class="field" name="exercise" id="exSel">${exOptions(formKind, v.exerciseId)}</select></label>
          <span class="muted" style="margin-top:6px">Minutos</span>
          <div class="pills" role="group" aria-label="Minutos" id="minPills">${minPills(durationsFor(formKind, ex, r ? v.min : null), v.min)}</div>
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
        ${r && adult ? '<button class="btn block" type="button" id="del" style="color:var(--brasa);border-color:rgba(233,178,125,0.35)">Borrar rutina</button>' : ''}
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
    const back = () => go(backTo(ctx));
    const profileSel = form.querySelector('[name=profile]');
    const exSel = form.querySelector('#exSel');
    const target = () => (profileSel ? profileSel.value : v.profile);
    const targetKind = () => store.profile(target()).kind;

    // Minutos según la edad y el ejercicio; al cambiar de ejercicio se usa su duración sugerida.
    const setMinutes = (wanted) => {
      const list = durationsFor(targetKind(), byId(exSel.value));
      state.min = list.includes(wanted) ? wanted : nearest(list, wanted);
      form.querySelector('#minPills').innerHTML = minPills(list, state.min);
    };

    root.querySelector('#presets')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      const id = target();
      const who = store.profile(id);
      const p = presets(who.kind)[Number(btn.dataset.preset)];
      store.addRoutine({ profile: id, kind: 'sesion', freq: 'daily', days: [], ...p });
      toast(`Listo: ${p.name} todos los días a las ${p.time}${id === me.id ? '' : ` para ${who.name}`}`);
      go(calendarOf(ctx, id));
    });

    profileSel?.addEventListener('change', () => {
      const kind = targetKind();
      exSel.innerHTML = exOptions(kind, exSel.value);
      const boltBtn = form.querySelector('[data-kind="bolt"]');
      boltBtn.style.display = kind === 'peque' ? 'none' : '';
      boltBtn.textContent = kind === 'adulto' ? 'Medir BOLT' : 'Reto del aire';
      if (kind === 'peque' && state.kind === 'bolt') {
        state.kind = 'sesion';
        press(form.querySelector('#kindSeg'), 'data-kind', state.kind);
        form.querySelector('#exRow').style.display = '';
      }
      setMinutes(defaultMin(kind, byId(exSel.value)));
      const box = root.querySelector('#presets');
      if (box) box.innerHTML = presetCards(store, target(), me.id);
    });

    exSel.addEventListener('change', () => setMinutes(defaultMin(targetKind(), byId(exSel.value))));

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
      askConfirm(`¿Borrar la rutina «${r.name}»? Los días pasados conservan lo que se hizo.`, { ok: 'Borrar' }).then((ok) => {
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
      const profile = target();
      const kid = store.profile(profile).kind !== 'adulto';
      const isBolt = state.kind === 'bolt';
      const fallback = isBolt ? (kid ? 'Reto del aire' : 'Medir BOLT') : (time < '12:00' ? 'Al despertar' : 'Antes de dormir');
      const data = {
        profile,
        kind: state.kind,
        name: form.elements.namedItem('name').value.trim() || fallback,
        exerciseId: isBolt ? null : exSel.value,
        minutes: isBolt ? 0 : state.min,
        time,
        freq: state.freq,
        days: state.freq === 'days' ? [...state.days].sort() : [],
        date: state.freq === 'once' ? date : undefined,
      };

      const commit = () => {
        if (r) {
          store.updateRoutine(r.id, data);
          toast(`Cambios guardados: ${data.name} a las ${data.time}`);
          back();
          return;
        }
        const saved = store.addRoutine({ ...data, since: state.freq === 'once' && date < dayKey() ? date : dayKey() });
        toast(state.freq === 'once' ? `Guardado: ${saved.name} a las ${saved.time}` : `Rutina guardada: ${saved.name} a las ${saved.time}`);
        go(calendarOf(ctx, profile));
      };

      // Misma persona, hora, ejercicio y frecuencia: casi siempre es un doble toque.
      const same = store.routines(profile).find((x) => x.id !== r?.id && x.kind === data.kind && x.time === data.time
        && (x.exerciseId || null) === data.exerciseId && x.freq === data.freq
        && (data.freq !== 'days' || [...(x.days || [])].sort().join() === data.days.join())
        && (data.freq !== 'once' || x.date === data.date));
      if (!same) { commit(); return; }
      askConfirm(`Ya hay una rutina igual: «${same.name}» a las ${same.time}. ¿Guardar otra?`, { ok: 'Guardar otra', cancel: 'No, cancelar' }).then((ok) => { if (ok) commit(); });
    });
  },
};
