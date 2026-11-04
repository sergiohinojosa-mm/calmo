// Mensajes con la maestra: sus notas y lo que le respondes, en una sola conversación.
// La maestra ve la misma conversación en el detalle de cada alumno.

import { esc, icon, toast, MESES } from '../ui.js';

const when = (iso) => {
  const d = new Date(iso);
  const t = d.toTimeString().slice(0, 5);
  return d.toDateString() === new Date().toDateString() ? `Hoy ${t}` : `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} · ${t}`;
};

// Burbujas de la más vieja a la más nueva. Lo de quien lee va a la derecha;
// «fresh» son las que le llegaron sin leer y «del» deja borrar las propias.
export function bubbles(store, list, viewer, { fresh = new Set(), del = false } = {}) {
  return list.map((n) => {
    const mine = n.by === viewer;
    const author = mine ? 'Tú' : store.isReply(n) ? (store.profile(n.by)?.name || 'Alumno') : store.teacherName(n.by);
    const status = mine ? (n.readAt ? ' · Leído' : ' · Enviado') : '';
    return `<div class="msg${mine ? ' mine' : ''}">
      <p>${esc(n.text)}</p>
      <span class="muted">${esc(author)} · ${when(n.at)}${status}${fresh.has(n.id) ? ' · <b class="new">Nuevo</b>' : ''}${mine && del
        ? `<button class="icon-btn" data-del-note="${esc(n.id)}" aria-label="Borrar mensaje" style="width:40px;height:40px;background:transparent;color:var(--muted);vertical-align:middle;margin:-8px -10px -8px 0">${icon('trash', 15)}</button>` : ''}</span>
    </div>`;
  }).join('');
}

// Lo que se lleva escrito sigue ahí si la pantalla se vuelve a dibujar.
let draft = '';

export default {
  tab: 'perfil',
  render(ctx) {
    const { store } = ctx;
    const p = ctx.profile;
    const t = store.teacher();
    const top = `<div class="top"><a class="icon-btn" href="#/perfil" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Mensajes</h1></div>`;
    if (p.kind !== 'adulto') return `${top}<p class="sub">Las notas de tu maestra te llegan en Inicio.</p>`;
    if (!t) return `${top}<p class="sub">Cuando tu maestra entre a Calmo con su usuario, aquí podrás escribirle.</p>`;
    const list = store.thread(p.id);
    const fresh = new Set(store.unreadNotes(p.id).map((n) => n.id));
    return `${top}
      <p class="sub" style="margin-top:0">Con ${esc(t.name)}, tu maestra de respiración. Escríbele tus dudas o respóndele sus notas.</p>
      <div class="thread" style="margin-top:16px">${list.length ? bubbles(store, list, p.id, { fresh }) : '<p class="muted" style="margin:0">Todavía no hay mensajes.</p>'}</div>
      <form id="say" class="card stack" style="margin-top:16px;gap:10px" novalidate>
        <label class="stack" style="gap:6px"><span class="muted">Escríbele a ${esc(t.name)}</span>
          <textarea class="field" name="text" rows="3" maxlength="280" placeholder="Tu duda o tu respuesta" style="padding:12px 14px;min-height:96px;resize:vertical">${esc(draft)}</textarea></label>
        <p class="muted" style="margin:0;font-size:12px">${esc(t.name)} lo ve la próxima vez que abra Calmo.</p>
        <button class="btn primary block" type="submit">${icon('msg', 18)} Enviar</button>
      </form>`;
  },
  mount(root, ctx) {
    const { store, rerender } = ctx;
    const p = ctx.profile;
    const form = root.querySelector('#say');
    if (!form) return null;
    // Abrir la conversación deja leídas las notas de la maestra (y se quitan de Inicio).
    store.markThreadRead(p.id);
    const box = form.elements.namedItem('text');
    if (root.querySelector('.msg')) form.scrollIntoView({ block: 'end' });
    if (ctx.query.get('responder')) box.focus({ preventScroll: true });
    box.addEventListener('input', () => { draft = box.value; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = box.value.trim();
      if (!text) { box.focus(); return; }
      if (!store.addNote(p.id, text)) return;
      draft = '';
      toast('Mensaje enviado');
      rerender();
    });
    return null;
  },
};
