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
  { c: 'cuando', t: 'Ante el estrés del momento', d: 'Unos minutos de suspiro cíclico, todo por la nariz, te ayudan a bajar la tensión. Después vuelve a respirar ligero.', p: 'suspiro' },
  { c: 'cuando', t: 'Para calmarte', d: 'Haz la exhalación más larga que la inhalación. El cuerpo entiende que todo está bien.', p: 'exhalacion' },
  { c: 'cuando', t: 'Si tienes la nariz tapada', d: 'Haz Destapar la nariz: retienes con la nariz tapada y mueves la cabeza. Después respira suave por la nariz.', p: 'destapar' },
  { c: 'bolt', t: 'Mide al despertar', d: 'El BOLT de la mañana, antes de cualquier actividad, es el más confiable para comparar.' },
  { c: 'bolt', t: 'La meta es 40 segundos', d: 'Oxygen Advantage pone la meta en 40 s. Empezar cerca de 20 es común; con práctica constante sube en pocas semanas.' },
  { c: 'bolt', t: 'Cada 5 segundos cuenta', d: 'Subir tu BOLT 5 segundos ya se nota: más energía y menos falta de aire al hacer ejercicio.' },
  { c: 'dormir', t: '4-7-8 en la cama', d: 'Hazla acostado, con la luz baja. Si te mareas, vuelve a respirar normal.', p: '478' },
  { c: 'dormir', t: 'Cinta en la boca, con precaución', d: 'Una tira pequeña ayuda a dormir con la boca cerrada. Pruébala de día primero y nunca con la nariz tapada. En niñas y niños, solo con la guía de tu maestra o tu médico.' },
  { c: 'ejercicio', t: 'Haz ejercicio con la boca cerrada', d: 'Baja la intensidad hasta poder respirar solo por la nariz. El cuerpo se adapta en pocas semanas.' },
  { c: 'seguridad', t: 'Retenciones solo en lugar seguro', d: 'Nunca en el agua ni manejando. Entre retenciones, recupera hasta que tu respiración vuelva a la calma (en la serie caminando, 60 segundos).' },
  { c: 'seguridad', t: 'Escucha a tu cuerpo', d: 'Si te mareas, detente y respira normal por la nariz. Si estás embarazada, sin retenciones. Con problemas de corazón o presión, diabetes, epilepsia, asma, pánico, desmayos, gripe u otra condición seria: solo falta de aire leve y consulta a tu médico.' },
];

// Para niñas: consejos cortos y amables, sin listas médicas ni cinta en la boca.
const KID_TIPS = [
  { c: 'oa', t: 'Tu nariz es tu superpoder', d: 'Respira por la nariz al jugar, al leer y al dormir. Tu nariz limpia y calienta el aire.' },
  { c: 'oa', t: 'Suavecito', d: 'Respira tan suave que casi no se oiga. Así tu cuerpo se calma.' },
  { c: 'oa', t: 'Labios juntos, lengua arriba', d: 'Cuando no hablas ni comes, junta los labios y deja la lengua pegadita arriba, detrás de los dientes. Así tu nariz hace el trabajo.' },
  { c: 'habitos', t: 'Antes de dormir', d: 'Unos minutos de respirar suavecito te ayudan a dormir mejor.' },
  { c: 'habitos', t: 'Poquito cada día', d: 'Unos minutos todos los días valen más que mucho un solo día. ¡Cada práctica suma para tus insignias!' },
  { c: 'cuando', t: 'Cuando sientas nervios', d: 'Suelta el aire más lento de lo que lo tomas, por la nariz. Te ayuda a calmarte.', p: 'exhalacion' },
  { c: 'cuando', t: 'Antes de un examen', d: 'Unas respiraciones suaves por la nariz, soltando el aire despacio, te ayudan a concentrarte.' },
  { c: 'cuando', t: 'Si tu nariz está tapada', d: 'Juega a Destapa tu nariz: te tapas la nariz, mueves la cabeza y luego respiras suavecito.', p: 'destapar' },
  { c: 'bolt', t: 'El reto del aire', d: 'No es una carrera: toca en cuanto tu cuerpo te pida aire.' },
  { c: 'bolt', t: 'Tu reto del aire crece', d: 'Mientras más respiras suave por la nariz, más crece tu reto del aire. Compárate solo contigo.' },
  { c: 'dormir', t: 'Duerme con los labios juntos', d: 'Respirar por la nariz mientras duermes te ayuda a descansar y a despertar con más energía.' },
  { c: 'ejercicio', t: 'Corre con la nariz', d: 'Si al correr se te abren los labios, ve un poquito más lento hasta que tu nariz pueda sola. Con práctica irás más rápido.' },
  { c: 'seguridad', t: 'Si te mareas', d: 'Para, respira suavecito por la nariz y avísale a papá o mamá.' },
  { c: 'seguridad', t: 'Cuéntales a papá o mamá', d: 'Si tu nariz se tapa muy seguido, cuéntaselo: te pueden ayudar.' },
];

// Nombres de categoría para las niñas.
const KID_CATS = { oa: 'Tu nariz', cuando: 'Para cada momento', bolt: 'Reto del aire', ejercicio: 'Jugar y correr', seguridad: 'Cuídate' };

export default {
  tab: 'perfil',
  render(ctx) {
    const kid = ctx.profile.kind !== 'adulto';
    const tips = kid ? KID_TIPS : TIPS;
    const cats = CATS.filter(([k]) => tips.some((t) => t.c === k)).map(([k, label]) => [k, (kid && KID_CATS[k]) || label]);
    const c = ctx.query.get('c') || 'todos';
    const shown = tips.filter((t) => c === 'todos' || t.c === c);
    const today = tips[new Date().getDate() % tips.length];
    return `<div class="top"><a class="icon-btn" href="#/perfil" aria-label="Volver">${icon('back', 20)}</a><h1 class="h1">Consejos</h1></div>
      <div class="card" style="border-color:rgba(226,204,148,0.35)">
        <span class="chip arena">${icon('sun', 14)} Consejo del día</span>
        <p class="h2" style="margin-top:10px;font-size:21px">${esc(today.t)}</p>
        <p class="sub">${esc(today.d)}</p>
      </div>
      <div class="pills" style="margin-top:16px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px" role="group" aria-label="Categorías">
        <a class="pill" style="display:inline-flex;align-items:center;flex:none;text-decoration:none;white-space:nowrap" href="#/consejos" aria-pressed="${c === 'todos'}">Todos</a>
        ${cats.map(([k, label]) => `<a class="pill" style="display:inline-flex;align-items:center;flex:none;text-decoration:none;white-space:nowrap" href="#/consejos?c=${k}" aria-pressed="${c === k}">${esc(label)}</a>`).join('')}
      </div>
      <div class="stack" style="margin-top:14px">
        ${shown.map((t) => `<div class="tile">
          <h2 class="h3" style="margin:0">${esc(t.t)}</h2>
          <p class="sub" style="margin-top:4px">${esc(t.d)}</p>
          ${t.p ? `<a href="#/configurar/${t.p}" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:14px;font-weight:600;text-decoration:none">${icon('play', 14)} Probar</a>` : ''}
        </div>`).join('')}
      </div>`;
  },
};
