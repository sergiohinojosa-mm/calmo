import { esc, icon, askConfirm } from '../ui.js';
import { byId, textsFor, goalLabel, AMBIENTS, DURATIONS } from '../catalog.js';

// Lo que llega en la dirección (#/configurar/...?amb=&rutina=) puede venir de un enlace ajeno:
// solo se acepta un ambiente de la lista y un id de rutina simple.
const validAmbient = (v) => (AMBIENTS.some((a) => a.id === v) ? v : '');
const validId = (v) => (/^[\w-]{1,40}$/.test(v || '') ? v : '');

// ¿El último BOLT del perfil queda por debajo de lo que pide el ejercicio?
const lowBoltOf = (store, ex, id) => {
  const lb = store.lastBolt(id);
  return ex.minBolt && lb && lb.seconds < ex.minBolt ? lb : null;
};

export default {
  tab: 'inicio',
  render(ctx) {
    const { store, query } = ctx;
    const kind = ctx.profile.kind;
    const kid = kind !== 'adulto';
    const ex = byId(ctx.params[0]) || byId('coherente');
    const t = textsFor(ex, kind);
    const prefs = store.prefs();
    // Para niñas, pocas opciones: 2, 3 o 5 minutos.
    const durs = (kid ? [2, 3, 5] : DURATIONS).filter((d) => !ex.maxMin || d <= ex.maxMin);
    const asked = Number(query.get('min')) || prefs.lastDur[ex.id] || t.defaultMin;
    const min = Math.min(ex.maxMin || 60, Math.max(1, Math.round(asked)));
    const other = !durs.includes(min);
    const amb = validAmbient(query.get('amb')) || validAmbient(prefs.ambient) || 'bosque';
    const rutina = validId(query.get('rutina'));
    const lb = lowBoltOf(store, ex, ctx.profile.id);
    const isSerie = ex.mode === 'serie';
    const fixed = ex.mode === 'pausas' || ex.mode === 'destapar';
    // Si falta más de 3 horas para la rutina, cuenta para ella solo si así se elige
    // (las niñas no eligen: cuenta como extra).
    const routine = rutina ? store.routines(ctx.profile.id).find((r) => r.id === rutina) : null;
    const early = store.tooEarlyFor(routine);
    const cuenta = query.get('cuenta') === '1' ? '1' : '0';
    const counts = !!rutina && (!early || (!kid && cuenta === '1'));
    const qs = (o) => `#/configurar/${ex.id}?min=${o.min ?? min}&amb=${o.amb ?? amb}${rutina ? `&rutina=${rutina}` : ''}${early ? `&cuenta=${o.cuenta ?? cuenta}` : ''}`;
    const start = isSerie ? '#/serie' : `#/sesion/${ex.id}?min=${min}&amb=${amb}${counts ? `&rutina=${rutina}` : ''}`;
    const lowMsg = kid
      ? `Este es para cuando tu reto del aire llegue a ${ex.minBolt} s. ¡Ya casi! Hazlo suave y con un adulto cerca.`
      : `Tu BOLT (${lb?.seconds} s) está por debajo de ${ex.minBolt} s. Puedes hacerlo, pero empieza suave.`;
    return `<div class="top"><a class="icon-btn" href="#/catalogo" aria-label="Volver">${icon('back', 20)}</a><span></span></div>
      <h1 class="h1">${esc(t.name)}</h1>
      <div class="pills" style="margin-top:10px">
        <span class="chip sage">${esc(goalLabel(ex.goal, kind))}</span><span class="chip">${esc(t.pattern)}</span><span class="chip">${icon('nose', 13)} Nariz</span>
      </div>
      <p class="sub" style="margin-top:14px">${esc(t.desc)}</p>
      ${lb ? `<div class="tile" style="margin-top:14px;color:var(--brasa)">${esc(lowMsg)}</div>` : ''}
      ${early && !kid ? `<div class="tile stack" style="margin-top:14px;gap:10px">
        <p style="margin:0;font-size:15px;line-height:1.45">Tu rutina «${esc(routine.name)}» es a las ${esc(routine.time)}. ¿Esta sesión cuenta para esa rutina?</p>
        <div class="seg" role="group" aria-label="¿Cuenta para la rutina?">
          <a href="${qs({ cuenta: '1' })}" ${cuenta === '1' ? 'aria-current="page"' : ''}>Sí, cuenta</a>
          <a href="${qs({ cuenta: '0' })}" ${cuenta === '0' ? 'aria-current="page"' : ''}>No, es extra</a>
        </div>
      </div>` : ''}
      ${t.steps ? `<details class="howto" style="margin-top:14px"><summary>
          <span class="howto-ic">${icon('list', 20)}</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:16px">Cómo se hace</span>
            <span class="muted"><span class="when-closed">${t.steps.length} pasos · toca para verlos</span><span class="when-open">Toca para cerrar</span></span></span>
          <span class="howto-chev">${icon('chev', 20)}</span></summary>
        <ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
      ${isSerie || fixed ? '' : `<p class="label">Duración</p>
      <div class="pills" role="group" aria-label="Duración">${durs.map((d) => `<a class="pill" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none" href="${qs({ min: d })}" ${d === min && !other ? 'aria-current="page"' : ''}>${d} min</a>`).join('')}
        ${kid ? '' : `<label class="pill" id="otherPill" aria-pressed="${other}" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">Otra
          <input type="number" inputmode="numeric" min="1" max="${ex.maxMin || 60}" step="1" value="${other ? min : ''}" placeholder="min" id="otherMin" aria-label="Otra duración en minutos" style="width:52px;min-height:32px;border:none;border-radius:10px;background:var(--bg);color:var(--text);text-align:center;font-size:16px"></label>`}
      </div>
      <p id="minErr" role="alert" class="muted" style="margin:6px 0 0;color:var(--brasa);min-height:16px"></p>`}
      ${isSerie ? '' : `<p class="label">Ambiente</p>
      <div class="grid2">${AMBIENTS.map((a) => `<a href="${qs({ amb: a.id })}" class="tile" ${a.id === amb ? 'aria-current="page"' : ''} style="color:inherit;text-decoration:none;border:1px solid ${a.id === amb ? 'var(--sage)' : 'var(--line)'};background:${a.id === amb ? 'rgba(156,197,161,0.14)' : 'var(--low)'}">
        ${icon(a.icon, 20)}<span style="display:block;margin-top:8px;font-weight:600;font-size:14px">${esc(a.label)}</span><span class="muted">${esc(a.detail)}</span></a>`).join('')}</div>
      ${kid ? '' : `<div class="tile stack" style="margin-top:14px">
        <label class="row" style="font-size:14px;color:var(--text2)"><span style="width:96px">Música</span><input type="range" min="0" max="100" value="${prefs.music}" data-pref="music"></label>
        <label class="row" style="font-size:14px;color:var(--text2)"><span style="width:96px">Tonos</span><input type="range" min="0" max="100" value="${prefs.tonesVol}" data-pref="tonesVol"></label>
        <div class="between" style="font-size:14px;color:var(--text2)">Tono en cada fase <button class="switch" role="switch" aria-checked="${prefs.tones}" aria-label="Tono en cada fase" data-toggle="tones"><span></span></button></div>
      </div>`}`}
      <a class="btn primary block" id="start" data-audio href="${start}" style="margin-top:22px">${icon('play', 18)} <span id="startLabel">${isSerie ? 'Ir a la serie' : `Empezar${fixed ? '' : ` · ${min} min`}`}</span></a>`;
  },
  mount(root, ctx) {
    const { store } = ctx;
    const kid = ctx.profile.kind !== 'adulto';
    const ex = byId(ctx.params[0]) || byId('coherente');
    const min = Number(ctx.query.get('min'));
    if (min) store.setPref('lastDur', { ...store.prefs().lastDur, [ex.id]: min });
    const amb = validAmbient(ctx.query.get('amb'));
    if (amb) store.setPref('ambient', amb);
    const startEl = root.querySelector('#start');
    const startLabel = root.querySelector('#startLabel');
    const otherMin = root.querySelector('#otherMin');
    const max = ex.maxMin || 60;
    const valid = () => {
      const v = Math.round(Number(otherMin.value));
      return v >= 1 && v <= max ? v : 0;
    };
    // "Otra": el botón de empezar se actualiza mientras escribes, sin volver a dibujar la pantalla.
    otherMin?.addEventListener('input', () => {
      const err = root.querySelector('#minErr');
      if (otherMin.value === '') { err.textContent = ''; return; }
      const v = valid();
      if (!v) { err.textContent = `Elige entre 1 y ${max} minutos.`; return; }
      err.textContent = '';
      startEl.setAttribute('href', startEl.getAttribute('href').replace(/([?&]min=)\d+/, `$1${v}`));
      startLabel.textContent = `Empezar · ${v} min`;
      root.querySelector('#otherPill').setAttribute('aria-pressed', 'true');
      root.querySelectorAll('.pills a.pill[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
    });
    otherMin?.addEventListener('change', () => {
      const v = valid();
      if (v) store.setPref('lastDur', { ...store.prefs().lastDur, [ex.id]: v });
    });
    // Si el ejercicio pide más BOLT del que tienes, se confirma antes de empezar.
    const lb = lowBoltOf(store, ex, ctx.profile.id);
    if (lb) {
      startEl.addEventListener('click', (e) => {
        e.preventDefault();
        const href = startEl.getAttribute('href');
        const msg = kid
          ? `Este ejercicio es para cuando tu reto del aire llega a ${ex.minBolt} s, y tú vas en ${lb.seconds} s. ¿Quieres hacerlo suave, con un adulto cerca?`
          : `Este ejercicio se recomienda con un BOLT de ${ex.minBolt} s o más y el tuyo es de ${lb.seconds} s. ¿Quieres hacerlo de todos modos, con calma?`;
        askConfirm(msg, { ok: 'Empezar suave', cancel: 'Elegir otro' }).then((ok) => {
          if (ok) ctx.go(href.replace(/^#\//, ''));
        });
      });
    }
    root.querySelectorAll('[data-pref]').forEach((el) => el.addEventListener('change', () => store.setPref(el.dataset.pref, Number(el.value))));
    root.querySelectorAll('[data-toggle]').forEach((el) => el.addEventListener('click', () => {
      const v = !store.prefs()[el.dataset.toggle];
      store.setPref(el.dataset.toggle, v);
      el.setAttribute('aria-checked', String(v));
    }));
  },
};
