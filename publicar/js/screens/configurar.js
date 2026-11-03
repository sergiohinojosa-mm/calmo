import { esc, icon } from '../ui.js';
import { byId, nameFor, GOALS, AMBIENTS, DURATIONS } from '../catalog.js';

export default {
  tab: 'inicio',
  render(ctx) {
    const { store, query } = ctx;
    const kind = ctx.profile.kind;
    const ex = byId(ctx.params[0]) || byId('coherente');
    const prefs = store.prefs();
    const durs = DURATIONS.filter((d) => !ex.maxMin || d <= ex.maxMin);
    const asked = Number(query.get('min')) || prefs.lastDur[ex.id] || ex.defaultMin;
    const min = Math.min(ex.maxMin || 60, Math.max(1, Math.round(asked)));
    const other = !durs.includes(min);
    const amb = query.get('amb') || prefs.ambient || 'bosque';
    const rutina = query.get('rutina') || '';
    const lb = store.lastBolt();
    const lowBolt = ex.minBolt && lb && lb.seconds < ex.minBolt;
    const isSerie = ex.mode === 'serie';
    const fixed = ex.mode === 'pausas' || ex.mode === 'destapar';
    const qs = (o) => `#/configurar/${ex.id}?min=${o.min ?? min}&amb=${o.amb ?? amb}${rutina ? `&rutina=${rutina}` : ''}`;
    const start = isSerie ? '#/serie' : `#/sesion/${ex.id}?min=${min}&amb=${amb}${rutina ? `&rutina=${rutina}` : ''}`;
    return `<div class="top"><a class="icon-btn" href="#/catalogo" aria-label="Volver">${icon('back', 20)}</a><span></span></div>
      <h1 class="h1">${esc(nameFor(ex, kind))}</h1>
      <div class="pills" style="margin-top:10px">
        <span class="chip sage">${esc(GOALS[ex.goal].label)}</span><span class="chip">${esc(ex.pattern)}</span><span class="chip">${icon('nose', 13)} Nariz</span>
      </div>
      <p class="sub" style="margin-top:14px">${esc(ex.desc)}</p>
      ${lowBolt ? `<div class="tile" style="margin-top:14px;color:var(--brasa)">Tu BOLT (${lb.seconds} s) está por debajo de ${ex.minBolt} s. Puedes hacerlo, pero empieza suave.</div>` : ''}
      ${ex.steps ? `<details class="tile" style="margin-top:14px"><summary style="min-height:28px;cursor:pointer;font-weight:600">Cómo se hace</summary>
        <ol style="margin:10px 0 0;padding-left:20px;color:var(--text2);line-height:1.6">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
      ${isSerie || fixed ? '' : `<p class="label">Duración</p>
      <div class="pills" role="group" aria-label="Duración">${durs.map((d) => `<a class="pill" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none" href="${qs({ min: d })}" aria-pressed="${d === min}">${d} min</a>`).join('')}
        <label class="pill" aria-pressed="${other}" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">Otra
          <input type="number" inputmode="numeric" min="1" max="${ex.maxMin || 60}" step="1" value="${other ? min : ''}" placeholder="min" id="otherMin" aria-label="Otra duración en minutos" style="width:52px;min-height:32px;border:none;border-radius:10px;background:var(--bg);color:var(--text);text-align:center;font-size:15px"></label>
      </div>
      <p id="minErr" role="alert" class="muted" style="margin:6px 0 0;color:var(--brasa);min-height:16px"></p>`}
      ${isSerie ? '' : `<p class="label">Ambiente</p>
      <div class="grid2">${AMBIENTS.map((a) => `<a href="${qs({ amb: a.id })}" class="tile" aria-pressed="${a.id === amb}" style="color:inherit;text-decoration:none;border:1px solid ${a.id === amb ? 'var(--sage)' : 'var(--line)'};background:${a.id === amb ? 'rgba(156,197,161,0.14)' : 'var(--low)'}">
        ${icon(a.icon, 20)}<span style="display:block;margin-top:8px;font-weight:600;font-size:14px">${esc(a.label)}</span><span class="muted">${esc(a.detail)}</span></a>`).join('')}</div>
      <div class="tile stack" style="margin-top:14px">
        <label class="row" style="font-size:14px;color:var(--text2)"><span style="width:96px">Música</span><input type="range" min="0" max="100" value="${prefs.music}" data-pref="music"></label>
        <label class="row" style="font-size:14px;color:var(--text2)"><span style="width:96px">Tonos</span><input type="range" min="0" max="100" value="${prefs.tonesVol}" data-pref="tonesVol"></label>
        <div class="between" style="font-size:14px;color:var(--text2)">Tono en cada fase <button class="switch" role="switch" aria-checked="${prefs.tones}" aria-label="Tono en cada fase" data-toggle="tones"><span></span></button></div>
      </div>`}
      <a class="btn primary block" data-audio href="${start}" style="margin-top:22px">${icon('play', 18)} ${isSerie ? 'Ir a la serie' : `Empezar${fixed ? '' : ` · ${min} min`}`}</a>`;
  },
  mount(root, ctx) {
    const { store } = ctx;
    const ex = byId(ctx.params[0]) || byId('coherente');
    const min = Number(ctx.query.get('min'));
    if (min) store.setPref('lastDur', { ...store.prefs().lastDur, [ex.id]: min });
    const amb = ctx.query.get('amb');
    if (amb) store.setPref('ambient', amb);
    const otherMin = root.querySelector('#otherMin');
    otherMin?.addEventListener('change', () => {
      const max = ex.maxMin || 60;
      const v = Math.round(Number(otherMin.value));
      const err = root.querySelector('#minErr');
      if (!v || v < 1 || v > max) { err.textContent = `Elige entre 1 y ${max} minutos.`; return; }
      err.textContent = '';
      const q = new URLSearchParams(ctx.query);
      q.set('min', String(v));
      ctx.go(`configurar/${ex.id}?${q.toString()}`);
    });
    root.querySelectorAll('[data-pref]').forEach((el) => el.addEventListener('change', () => store.setPref(el.dataset.pref, Number(el.value))));
    root.querySelectorAll('[data-toggle]').forEach((el) => el.addEventListener('click', () => {
      const v = !store.prefs()[el.dataset.toggle];
      store.setPref(el.dataset.toggle, v);
      el.setAttribute('aria-checked', String(v));
    }));
  },
};
