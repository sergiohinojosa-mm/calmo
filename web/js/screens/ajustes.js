import { esc, icon, toast, askConfirm, askPin, dayKey } from '../ui.js';
import { AMBIENTS } from '../catalog.js';
import * as sync from '../sync.js';

export default {
  tab: 'perfil',
  render(ctx) {
    const { store } = ctx;
    const p = ctx.profile;
    const pr = store.prefs();
    const adult = p.kind === 'adulto';
    // La maestra solo ve sonido y su cuenta: nada de PIN, perfiles ni datos de la familia.
    const teacher = sync.isTeacher();
    return `<div class="top">${teacher ? '' : `<a class="icon-btn" href="#/perfil" aria-label="Volver">${icon('back', 20)}</a>`}<h1 class="h1">${teacher ? 'Cuenta' : 'Ajustes'}</h1></div>

      <p class="label">Durante la sesión</p>
      <div class="card" style="padding:6px 16px">
        <div class="between list-row"><span><span style="display:block">Tono en cada fase</span><span class="muted">Un sonido distinto al inhalar, retener y exhalar</span></span>
          <button class="switch" role="switch" aria-checked="${!!pr.tones}" aria-label="Tono en cada fase" data-toggle="tones"><span></span></button></div>
        <label class="row list-row" style="font-size:15px"><span style="width:110px;color:var(--text2)">Música</span><input type="range" min="0" max="100" value="${pr.music}" data-pref="music" aria-label="Volumen de música"></label>
        <label class="row list-row" style="font-size:15px"><span style="width:110px;color:var(--text2)">Tonos</span><input type="range" min="0" max="100" value="${pr.tonesVol}" data-pref="tonesVol" aria-label="Volumen de tonos"></label>
      </div>

      <p class="label">Ambiente por defecto</p>
      <div class="grid2">${AMBIENTS.map((a) => `<button class="tile" data-amb="${a.id}" aria-pressed="${pr.ambient === a.id}" style="text-align:left;color:var(--text);border:1px solid ${pr.ambient === a.id ? 'var(--sage)' : 'var(--line)'};background:${pr.ambient === a.id ? 'rgba(156,197,161,0.14)' : 'var(--low)'}">
        ${icon(a.icon, 20)}<span style="display:block;margin-top:8px;font-weight:600;font-size:14px">${esc(a.label)}</span></button>`).join('')}</div>

      ${adult && !teacher ? `<p class="label">PIN de ${esc(p.name)}</p>
      <div class="card" id="pinCard">
        <p class="sub" style="margin:0">${store.hasPin(p.id)
          ? 'Tu perfil está protegido con PIN. Se pide al volver de un perfil de niña y al aprobar premios.'
          : 'Todavía no tienes PIN. Te pediremos crearlo antes de pasarle el teléfono a una niña o de aprobar un premio.'}</p>
        <div class="row" style="margin-top:12px">
          <button class="btn small" id="pinSet">${icon('lock', 16)} ${store.hasPin(p.id) ? 'Cambiar PIN' : 'Crear PIN'}</button>
          ${store.hasPin(p.id) ? '<button class="btn small" id="pinClear">Quitar PIN</button>' : ''}
        </div>
      </div>` : ''}

      ${adult && sync.enabled() ? `<p class="label">Cuenta</p>
      <div class="card" style="padding:6px 16px">
        <a class="list-row" href="#/usuarios">${icon('lock', 20, 'style="color:var(--text2);flex:none"')}<span style="flex:1"><span style="display:block">Cuenta y usuarios</span><span class="muted">Contraseña, quién puede entrar y cerrar sesión</span></span>${icon('chev', 18, 'style="color:var(--muted)"')}</a>
      </div>` : ''}

      ${adult && p.admin && !teacher ? `<p class="label">Familia</p>
      <div class="card" style="padding:6px 16px">
        <a class="list-row" href="#/perfiles?de=ajustes">${icon('users', 20, 'style="color:var(--text2);flex:none"')}<span style="flex:1"><span style="display:block">Perfiles de la familia</span><span class="muted">Agregar, renombrar o quitar</span></span>${icon('chev', 18, 'style="color:var(--muted)"')}</a>
      </div>

      ${teacher ? '' : `<p class="label">Datos</p>
      <div class="card" style="padding:6px 16px">
        <button class="list-row" id="export" style="width:100%;padding:0;background:none;border:none;border-bottom:1px solid var(--line);text-align:left">${icon('download', 20, 'style="color:var(--text2)"')}<span style="flex:1"><span style="display:block">Exportar respaldo</span><span class="muted">Guarda un archivo con todo, por si cambias de teléfono</span></span></button>
        <label class="list-row" style="width:100%;border-bottom:1px solid var(--line);cursor:pointer">${icon('upload', 20, 'style="color:var(--text2)"')}<span style="flex:1"><span style="display:block">Importar respaldo</span><span class="muted">Recupera un archivo calmo-AAAA-MM-DD.json</span></span>
          <input type="file" id="import" accept="application/json,.json" class="sr-only"></label>
        <button class="list-row" id="reset" style="width:100%;padding:0;background:none;border:none;text-align:left;color:var(--brasa)">${icon('trash', 20)}<span style="flex:1">Borrar todo y empezar de nuevo</span></button>
      </div>
      `}
      <p class="muted" style="margin-top:10px">${sync.enabled() ? 'Tus datos se guardan en el teléfono y en el servidor de la familia.' : 'Los datos viven en este teléfono. Exporta un respaldo de vez en cuando.'}</p>` : ''}`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const p = ctx.profile;
    root.querySelectorAll('[data-toggle]').forEach((el) => el.addEventListener('click', () => {
      const v = !store.prefs()[el.dataset.toggle];
      store.setPref(el.dataset.toggle, v);
      el.setAttribute('aria-checked', String(v));
    }));
    root.querySelectorAll('[data-pref]').forEach((el) => el.addEventListener('change', () => store.setPref(el.dataset.pref, Number(el.value))));
    root.querySelectorAll('[data-amb]').forEach((el) => el.addEventListener('click', () => { store.setPref('ambient', el.dataset.amb); rerender(); }));

    // Crear o cambiar el PIN: se escribe dos veces. Cambiarlo o quitarlo pide antes el actual.
    const mine = (pin) => store.checkPin(p.id, pin);
    root.querySelector('#pinSet')?.addEventListener('click', async () => {
      const had = store.hasPin(p.id);
      const pin = await askPin(had
        ? { title: 'Cambiar tu PIN', check: mine, prompt: 'Escribe tu PIN actual', create: true }
        : { title: 'Crea tu PIN', sub: 'Son 4 números. Se piden al volver de un perfil de niña y al aprobar premios.', create: true });
      if (!pin) return;
      store.setPin(p.id, pin);
      toast(had ? 'PIN cambiado' : 'PIN guardado');
      rerender();
    });
    root.querySelector('#pinClear')?.addEventListener('click', async () => {
      const ok = await askPin({ title: 'Quitar tu PIN', sub: 'Sin PIN, para pasarle el teléfono a una niña tendrás que crear uno de nuevo.', check: mine, prompt: 'Escribe tu PIN actual para quitarlo', cancel: 'No quitar' });
      if (!ok) return;
      store.clearPin(p.id);
      toast('Quitaste tu PIN');
      rerender();
    });

    root.querySelector('#export')?.addEventListener('click', async () => {
      const filename = `calmo-${dayKey()}.json`;
      const json = store.exportJSON();
      const dl = window.claude?.use ? await window.claude.use('downloads') : null;
      if (dl) {
        try { await dl.save({ filename, data: json }); toast('Respaldo exportado'); }
        catch (e) { if (e?.code !== 'declined') toast('No se pudo exportar ahora'); }
        return;
      }
      // En iPhone, compartir el archivo funciona mejor que una descarga (Guardar en Archivos, AirDrop…).
      const file = typeof File === 'function' ? new File([json], filename, { type: 'application/json' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Respaldo de Calmo' }); toast('Respaldo exportado'); return; }
        catch (e) { if (e?.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Respaldo exportado: ${filename}`);
    });
    root.querySelector('#import')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      file.text().then((text) => {
        askConfirm('Se reemplazarán los datos de este teléfono por los del respaldo. ¿Continuar?', { ok: 'Importar' }).then((ok) => {
          if (!ok) return;
          let done = false;
          try { done = typeof store.importJSON === 'function' && store.importJSON(text) !== false; } catch (err) { done = false; }
          if (done) { toast('Respaldo importado'); location.hash = '#/inicio'; }
          else toast('Ese archivo no es un respaldo de Calmo');
        });
      });
    });
    root.querySelector('#reset')?.addEventListener('click', () => {
      askConfirm('Se borrarán todas las sesiones, mediciones y rutinas. ¿Continuar?', { ok: 'Borrar todo' }).then((ok) => {
        if (!ok) return;
        store.resetAll();
        toast('Listo, empezamos de nuevo');
        location.hash = '#/inicio';
      });
    });
  },
};
