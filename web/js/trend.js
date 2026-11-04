// Línea de BOLT o de pasos con su meta: en Progreso, en el detalle de cada alumno y en
// Mi perfil de las niñas. Se toca o se desliza el dedo para ver cada medición.

import { esc, dayKey, dow, DIAS_C, MESES, pad2 } from './ui.js';

const MES_C = (i) => MESES[i].slice(0, 3);

export const shortDay = (d) => (dayKey(d) === dayKey(new Date()) ? 'Hoy' : `${d.getDate()} ${MES_C(d.getMonth())}`);

// Mediciones del periodo en una línea. La escala sigue a las mediciones para que un cambio de
// pocos segundos se note; la meta punteada entra solo si queda cerca, si no se indica arriba.
// Es una sola serie: el título la nombra y la lista de abajo da los valores exactos.
export function trendChart(points, { per, p, goal, color, what, unit, scope = 'en este periodo' }) {
  const W = 280, H = 124, L = 6, R = 52, T = 18, B = p === 'dia' ? 8 : 24;
  const t0 = new Date(per.from.getFullYear(), per.from.getMonth(), per.from.getDate()).getTime();
  // El mes en curso termina hoy: los días que faltan no aplastan la línea a la izquierda.
  const end = dayKey(per.to) > dayKey(new Date()) ? new Date() : per.to;
  const t1 = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime();
  const vals = points.map((m) => m.v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const goalIn = goal <= hi + Math.max(6, (hi - lo) * 1.5);
  const top0 = goalIn ? Math.max(hi, goal) : hi;
  const pad = Math.max(2, (top0 - lo) * 0.15);
  const min = Math.max(0, lo - pad);
  const max = top0 + pad;
  const x = (t) => L + Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) * (W - L - R);
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const pts = points.map((m) => [x(m.t), y(m.v), m]);
  const first = pts[0];
  const last = pts.at(-1);
  const gy = y(goal).toFixed(1);
  const valueText = ([a, b, m], anchor) => `<text class="val" x="${a.toFixed(1)}" y="${(b - 10).toFixed(1)}" text-anchor="${anchor}" style="fill:var(--text);font-size:13px;font-weight:600;font-family:var(--sans)">${m.v}</text>`;
  const label = `${what} ${scope}: ${points.length} ${points.length === 1 ? 'medición' : 'mediciones'}${points.length > 1 ? `, de ${lo} a ${hi}${unit}` : `, ${hi}${unit}`}. Meta ${goal}${unit}.`;
  return `<div class="trend" style="margin-top:14px">
  <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" tabindex="0" aria-label="${esc(label)} Toca la línea o usa las flechas para ver cada medición." style="display:block;overflow:visible">
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" style="stroke:var(--line2)" stroke-width="1"/>
    ${goalIn ? `<line x1="${L}" x2="${W - R}" y1="${gy}" y2="${gy}" style="stroke:var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="${W - R + 6}" y="${gy}" dy="4" style="fill:var(--text2);font-size:12px;font-family:var(--sans)">Meta ${goal}</text>`
    : `<text x="${W - R + 6}" y="${T}" dy="4" style="fill:var(--text2);font-size:12px;font-family:var(--sans)">Meta ${goal} ↑</text>`}
    ${pts.length > 1 ? `<polyline points="${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    <line class="guide" x1="0" x2="0" y1="${T - 6}" y2="${H - B}" style="stroke:var(--text2)" stroke-width="1" visibility="hidden"/>
    ${pts.map(([a, b, m]) => `<circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="4" style="fill:${color};stroke:var(--card)" stroke-width="2" data-pt data-when="${esc(m.when)}" data-val="${esc(m.val)}"/>`).join('')}
    <circle class="sel" cx="0" cy="0" r="6" style="fill:${color};stroke:var(--text)" stroke-width="2" visibility="hidden"/>
    ${pts.length > 1 && last[0] - first[0] > 36 ? valueText(first, first[0] < L + 10 ? 'start' : 'middle') : ''}
    ${valueText(last, last[0] > W - R - 16 ? 'end' : 'middle')}
    ${p === 'dia' ? '' : `<text x="${L}" y="${H - 4}" style="fill:var(--muted);font-size:11px;font-family:var(--sans)">${esc(shortDay(per.from))}</text>
    <text x="${W - R}" y="${H - 4}" text-anchor="end" style="fill:var(--muted);font-size:11px;font-family:var(--sans)">${esc(shortDay(end))}</text>`}
  </svg>
  <div class="tip" aria-live="polite" hidden></div>
  </div>
  <p class="muted" style="margin:6px 0 0;font-size:12px">Toca o desliza el dedo sobre la línea para ver cada medición.</p>`;
}

// Tocar o deslizar sobre la línea muestra la medición más cercana: fecha, hora y valor.
// También con el ratón y con las flechas del teclado. El globo se queda hasta tocar fuera.
function mountTrend(box) {
  const svg = box.querySelector('svg');
  const tip = box.querySelector('.tip');
  const guide = box.querySelector('.guide');
  const sel = box.querySelector('.sel');
  const pts = [...box.querySelectorAll('[data-pt]')].map((c) => ({ x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')), when: c.dataset.when, val: c.dataset.val }));
  const W = svg.viewBox.baseVal.width;
  const H = svg.viewBox.baseVal.height;
  let at = -1;
  const show = (i) => {
    at = Math.max(0, Math.min(pts.length - 1, i));
    const pt = pts[at];
    [['x1', pt.x], ['x2', pt.x]].forEach(([k, v]) => guide.setAttribute(k, v));
    sel.setAttribute('cx', pt.x);
    sel.setAttribute('cy', pt.y);
    guide.setAttribute('visibility', 'visible');
    sel.setAttribute('visibility', 'visible');
    tip.innerHTML = `<span class="muted">${esc(pt.when)}</span><b>${esc(pt.val)}</b>`;
    tip.style.left = `${(pt.x / W) * 100}%`;
    tip.style.top = `${(pt.y / H) * svg.getBoundingClientRect().height}px`;
    tip.dataset.edge = pt.x / W < 0.2 ? 'start' : pt.x / W > 0.75 ? 'end' : '';
    tip.hidden = false;
    box.classList.add('picking');
  };
  const hide = () => {
    at = -1;
    guide.setAttribute('visibility', 'hidden');
    sel.setAttribute('visibility', 'hidden');
    tip.hidden = true;
    box.classList.remove('picking');
  };
  const nearest = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    return pts.reduce((best, p, i) => (Math.abs(p.x - x) < Math.abs(pts[best].x - x) ? i : best), 0);
  };
  let down = false;
  svg.addEventListener('pointerdown', (e) => { down = true; show(nearest(e)); });
  svg.addEventListener('pointermove', (e) => { if (down || e.pointerType === 'mouse') show(nearest(e)); });
  svg.addEventListener('pointerup', () => { down = false; });
  svg.addEventListener('pointercancel', () => { down = false; });
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(at < 0 ? pts.length - 1 : at + (e.key === 'ArrowRight' ? 1 : -1)); }
    if (e.key === 'Escape') hide();
  });
  svg.addEventListener('blur', hide);
  const outside = (e) => { if (at >= 0 && !box.contains(e.target)) hide(); };
  document.addEventListener('pointerdown', outside);
  return () => document.removeEventListener('pointerdown', outside);
}

// Día de la semana, fecha y hora de una medición, como se lee en el globo.
const fullWhen = (iso) => {
  const d = new Date(iso);
  return `${dayKey(d) === dayKey(new Date()) ? 'Hoy' : `${DIAS_C[dow(d)]} ${d.getDate()} ${MES_C(d.getMonth())}`} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const boltPoints = (list) => list.map((m) => ({ t: new Date(m.takenAt).getTime(), v: m.seconds, when: fullWhen(m.takenAt), val: `${m.seconds} s` }));
export const stepPoints = (list) => list.map((m) => ({
  t: new Date(m.takenAt).getTime(), v: m.steps, when: fullWhen(m.takenAt),
  val: m.series && m.series.length > 1 ? `${m.steps} pasos (${m.series.join(' · ')})` : `${m.steps} pasos`,
}));

// Para el detalle de un alumno y Mi perfil: las últimas mediciones, de la primera a hoy.
export const recentSpan = (list) => ({ from: new Date(list[0].takenAt), to: new Date() });

// Activa todas las líneas de una pantalla; regresa con qué apagarlas al salir.
export function mountTrends(root) {
  const stops = [...root.querySelectorAll('.trend')].map(mountTrend);
  return () => stops.forEach((stop) => stop());
}
