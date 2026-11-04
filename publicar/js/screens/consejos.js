import { esc, icon } from '../ui.js';

const CATS = [
  ['oa', 'Oxygen Advantage'],
  ['habitos', 'Hábitos'],
  ['cuando', 'Cuándo usar cada técnica'],
  ['bolt', 'Mejorar el BOLT'],
  ['dormir', 'Dormir'],
  ['ejercicio', 'Ejercicio físico'],
  ['seguridad', 'Seguridad'],
];

const TIPS = [
  { c: 'oa', t: 'Nariz día y noche', d: 'Respira por la nariz al caminar, al trabajar y al dormir. La nariz filtra, calienta y humedece el aire.' },
  { c: 'oa', t: 'Respira ligero', d: 'Respirar un poco menos de lo que pide el cuerpo, sin tensarte, sube tu tolerancia al CO₂.', p: 'ligero' },
  { c: 'oa', t: 'Respira con el diafragma', d: 'El diafragma hace el trabajo; los hombros y la cara se quedan relajados. Respira suave, lento y por la nariz.' },
  { c: 'oa', t: 'En el día, evita suspiros y bostezos grandes', d: 'Fuera de los ejercicios, cada suspiro grande te saca de ritmo. Si llega uno, trágalo y respira suave por la nariz.' },
  { c: 'habitos', t: 'Practica a la misma hora', d: 'Atar la práctica a algo diario, como despertar o acostarte, la vuelve automática.' },
  { c: 'habitos', t: 'Estómago vacío', d: 'Practica mejor unas 2 horas después de comer: la respiración es más ligera.' },
  { c: 'cuando', t: 'Antes de una junta', d: 'Tres minutos de respiración cuadrada te ayudan a enfocarte.', p: 'cuadrada' },
  { c: 'cuando', t: 'Ante el estrés del momento', d: 'Dos o tres minutos de suspiro cíclico, todo por la nariz, bajan la tensión rápido.', p: 'suspiro' },
  { c: 'cuando', t: 'Para calmarte', d: 'Haz la exhalación más larga que la inhalación. El cuerpo entiende que todo está bien.', p: 'exhalacion' },
  { c: 'bolt', t: 'Mide al despertar', d: 'El BOLT de la mañana, antes de cualquier actividad, es el más confiable para comparar.' },
  { c: 'bolt', t: 'Cada 5 segundos cuenta', d: 'Subir tu BOLT 5 segundos ya se nota en tu energía y tu sueño.' },
  { c: 'dormir', t: '4-7-8 en la cama', d: 'Hazla acostado, con la luz baja. Si te mareas, vuelve a respirar normal.', p: '478' },
  { c: 'dormir', t: 'Cinta en la boca, con precaución', d: 'Una tira pequeña ayuda a dormir con la boca cerrada. Pruébala de día primero y nunca con la nariz tapada. En niñas y niños, solo con la guía de tu maestra o tu médico.' },
  { c: 'ejercicio', t: 'Haz ejercicio con la boca cerrada', d: 'Baja la intensidad hasta poder respirar solo por la nariz. El cuerpo se adapta en pocas semanas.' },
  { c: 'seguridad', t: 'Retenciones solo en lugar seguro', d: 'Nunca en el agua ni manejando. Recupera siempre 60 segundos entre retenciones.' },
  { c: 'seguridad', t: 'Escucha a tu cuerpo', d: 'Si te mareas o sientes ansiedad, detente y respira normal por la nariz. Antes de hacer retenciones largas, consulta a tu médico si hay embarazo, presión alta, problemas del corazón, diabetes, epilepsia o ataques de pánico.' },
];

export default {
  tab: 'perfil',
  render(ctx) {
    const c = ctx.query.get('c') || 'todos';
    const shown = TIPS.filter((t) => c === 'todos' || t.c === c);
    const today = TIPS[new Date().getDate() % TIPS.length];
    return `<div class="top"><a class="icon-btn" href="#/perfil" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Consejos</h1></div>
      <div class="card" style="border-color:rgba(226,204,148,0.35)">
        <span class="chip arena">${icon('sun', 14)} Consejo del día</span>
        <p class="h2" style="margin-top:10px;font-size:21px">${esc(today.t)}</p>
        <p class="sub">${esc(today.d)}</p>
      </div>
      <div class="pills" style="margin-top:16px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px" role="group" aria-label="Categorías">
        <a class="pill" style="display:inline-flex;align-items:center;text-decoration:none;white-space:nowrap" href="#/consejos" aria-pressed="${c === 'todos'}">Todos</a>
        ${CATS.map(([k, label]) => `<a class="pill" style="display:inline-flex;align-items:center;text-decoration:none;white-space:nowrap" href="#/consejos?c=${k}" aria-pressed="${c === k}">${esc(label)}</a>`).join('')}
      </div>
      <div class="stack" style="margin-top:14px">
        ${shown.map((t) => `<div class="tile">
          <p class="h3" style="margin:0">${esc(t.t)}</p>
          <p class="sub" style="margin-top:4px">${esc(t.d)}</p>
          ${t.p ? `<a href="#/configurar/${t.p}" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:14px;font-weight:600;text-decoration:none">${icon('play', 14)} Probar</a>` : ''}
        </div>`).join('')}
      </div>`;
  },
};
