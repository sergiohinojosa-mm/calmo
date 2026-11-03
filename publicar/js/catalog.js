// Catálogo predefinido. Todo se respira por la nariz.
// phases: [tipo, segundos, etiqueta opcional]. Tipos: in, hold, out, wait.

export const PHASE = {
  in: { label: 'Inhala', kid: 'Toma aire', color: '#B9DEC3', freq: 523.25 },
  hold: { label: 'Retén', kid: 'Aguanta', color: '#E2CC94', freq: 440 },
  out: { label: 'Exhala', kid: 'Suelta el aire', color: '#6FA58A', freq: 349.23 },
  wait: { label: 'Espera', kid: 'Descansa', color: '#7C8F84', freq: 293.66 },
};

export const GOALS = {
  equilibrio: { label: 'Equilibrio', color: '#9CC5A1' },
  calma: { label: 'Calma', color: '#6FA58A' },
  enfoque: { label: 'Enfoque', color: '#E2CC94' },
  dormir: { label: 'Dormir', color: '#B9DEC3' },
  bolt: { label: 'BOLT', color: '#E9DFC4' },
};

export const EXERCISES = [
  {
    id: 'coherente', name: 'Respiración coherente', kidName: 'Respira como las olas', goal: 'equilibrio', pattern: '5.5 · 5.5',
    profiles: ['adulto', 'junior'], phases: [['in', 5.5], ['out', 5.5]], defaultMin: 10,
    desc: 'Unas 6 respiraciones por minuto, suaves y por la nariz. Equilibra tu ritmo y baja el estrés.',
    steps: ['Siéntate erguido y relaja los hombros.', 'Cierra la boca: todo es por la nariz.', 'Inhala suave 5.5 segundos.', 'Exhala sin prisa 5.5 segundos.', 'Deja que se mueva el abdomen, no el pecho.'],
    hints: ['Deja que se mueva el abdomen, no el pecho.', 'Inhala suave, sin llenar del todo.', 'Exhala sin prisa, como una brisa.', 'Hombros sueltos, mandíbula relajada.'],
  },
  {
    id: 'exhalacion', name: 'Exhalación larga', kidName: 'Suelta el aire despacito', goal: 'calma', pattern: '5 · 8',
    profiles: ['adulto', 'junior'], phases: [['in', 5], ['out', 8]], juniorPhases: [['in', 4], ['out', 6]], defaultMin: 5,
    desc: 'La exhalación más larga que la inhalación activa la calma del cuerpo.',
    steps: ['Inhala suave por la nariz 5 segundos.', 'Exhala por la nariz, despacio, 8 segundos.', 'Si te cuesta, usa 4 · 6.'],
    hints: ['Alarga la exhalación sin forzar.', 'Siente cómo se aflojan los hombros.'],
  },
  {
    id: 'triangulo', name: 'Triángulo', kidName: 'El triángulo', goal: 'enfoque', pattern: '4 · 4 · 4',
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 4], ['out', 4]], defaultMin: 5,
    desc: 'Una versión sencilla de la respiración cuadrada para enfocarte.',
    steps: ['Inhala 4 segundos.', 'Retén suave 4 segundos.', 'Exhala 4 segundos.'],
    hints: ['Retén sin apretar.', 'Mantén el ritmo parejo.'],
  },
  {
    id: 'cuadrada', name: 'Respiración cuadrada', kidName: 'La caja', goal: 'enfoque', pattern: '4 · 4 · 4 · 4', minBolt: 10,
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 4], ['out', 4], ['wait', 4]], defaultMin: 5,
    desc: 'Cuatro tiempos iguales. Ideal antes de una junta o un examen.',
    steps: ['Inhala 4.', 'Retén 4.', 'Exhala 4.', 'Espera 4 con los pulmones tranquilos.'],
    hints: ['Imagina que dibujas un cuadrado.', 'Cada lado dura lo mismo.'],
  },
  {
    id: 'alterna', name: 'Respiración alterna', kidName: 'Un lado y el otro', goal: 'equilibrio', pattern: '4 · 4 · 4', alternate: true,
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 4], ['out', 4]], defaultMin: 5,
    desc: 'Alternas la fosa nasal con el dedo. Equilibra y concentra.',
    steps: ['Tapa la fosa derecha con el pulgar e inhala por la izquierda.', 'Tapa ambas y retén.', 'Suelta la derecha y exhala por ese lado.', 'La pantalla te dice qué lado sigue.'],
    hints: ['Mueve solo los dedos, el resto relajado.'],
  },
  {
    id: '478', name: '4-7-8', kidName: 'Respira para dormir', goal: 'dormir', pattern: '4 · 7 · 8', minBolt: 10,
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 7], ['out', 8]], defaultMin: 5,
    desc: 'Para conciliar el sueño. Al inicio puede marear un poco: hazlo acostado.',
    steps: ['Inhala 4 por la nariz.', 'Retén 7.', 'Exhala 8 por la nariz, muy despacio.'],
    hints: ['Afloja la cara y la mandíbula.', 'Deja que el cuerpo pese.'],
  },
  {
    id: 'suspiro', name: 'Suspiro cíclico', kidName: 'Dos sorbitos de aire', goal: 'calma', pattern: '2 + 1 · 6',
    profiles: ['adulto', 'junior'], phases: [['in', 2], ['in', 1, 'Un poquito más'], ['out', 6]], defaultMin: 3, maxMin: 5,
    desc: 'Doble inhalación y una exhalación larga, todo por la nariz. Baja el estrés en pocos minutos.',
    steps: ['Inhala por la nariz.', 'Toma un poquito más de aire.', 'Exhala largo por la nariz.'],
    hints: ['La segunda inhalación es pequeña.', 'Exhala hasta vaciar sin forzar.'],
  },
  {
    id: 'destapar', name: 'Destapar la nariz', kidName: 'Destapa tu nariz', goal: 'bolt', pattern: '6 repeticiones', mode: 'destapar', reps: 6,
    profiles: ['adulto', 'junior'], defaultMin: 5,
    desc: 'Para cuando tienes la nariz tapada. Retienes con la nariz cerrada y mueves la cabeza.',
    steps: ['Exhala normal por la nariz.', 'Tapa la nariz y mueve la cabeza arriba y abajo.', 'Cuando sientas falta de aire moderada, suelta y respira calmado por la nariz.', 'Recupera 45 segundos y repite.'],
  },
  {
    id: 'ligero', name: 'Respira ligero en reposo', kidName: 'Respira suavecito', goal: 'bolt', pattern: 'Bloques de 4 + 1 min', mode: 'ligero', reduced: true,
    profiles: ['adulto', 'junior'], phases: [['in', 3], ['out', 4]], defaultMin: 10, blockOn: 240, blockOff: 60, juniorBlockOn: 120,
    desc: 'Respiración reducida (Oxygen Advantage): respira un 20–30 % menos aire, suave y lento, hasta sentir una falta de aire leve.',
    steps: ['Siéntate erguido, una mano en el pecho y otra en el abdomen.', 'Respira un poco menos de lo que tu cuerpo pide.', 'Suaviza la respiración hasta que casi no se note.', 'Si la falta de aire es fuerte, respira normal 15 segundos.'],
    hints: ['Respira un poco menos de lo que tu cuerpo pide.', 'Suaviza la respiración hasta que casi no se note.', 'Relaja los hombros y el abdomen.', 'Si la falta de aire se vuelve fuerte, toca «Necesito aire».'],
  },
  {
    id: 'pausas', name: 'Respiración reducida con pausas de control', kidName: 'Respira suave y mide', goal: 'bolt', pattern: '3 rondas', mode: 'pausas', reduced: true, minBolt: 10,
    profiles: ['adulto', 'junior'], phases: [['in', 3], ['out', 4]], rounds: 3, reducedSec: 180, defaultMin: 12,
    desc: 'Respiración reducida (Buteyko): mides tu pausa de control, respiras reducido y vuelves a medir para ver cuánto mejoras.',
    steps: ['Mide tu pausa de control: exhala, tapa la nariz y toca al primer deseo de respirar.', 'Recupera 15 segundos.', 'Respira reducido 3 minutos.', 'Mide otra vez. Se repite 3 rondas.'],
    hints: ['Respira un poco menos de lo que tu cuerpo pide.', 'Suave y lento, por la nariz.'],
  },
  {
    id: 'caminando', name: 'Retenciones caminando', kidName: 'Camina sin respirar', goal: 'bolt', pattern: '6 a 10 · 60 s de recuperación', mode: 'serie',
    profiles: ['adulto', 'junior'], defaultMin: 10,
    desc: 'Simulación de altitud: retienes el aire mientras caminas y recuperas 60 segundos entre cada una.',
    steps: ['Exhala normal y tápate la nariz.', 'Camina contando pasos hasta una falta de aire moderada.', 'Suelta y recupera 60 segundos por la nariz.', 'Repite de 6 a 10 veces.'],
  },
  {
    id: 'flor', name: 'Huele la flor', goal: 'calma', pattern: '1 minuto', profiles: ['peque'],
    phases: [['in', 3, 'Huele la flor'], ['out', 4, 'Suelta el aire']], defaultMin: 1, kidVisual: 'flor',
    desc: 'Huele una flor por la nariz y suelta el aire despacito, también por la nariz.',
  },
  {
    id: 'vela', name: 'La vela tranquila', goal: 'calma', pattern: '2 minutos', profiles: ['peque'],
    phases: [['in', 3, 'Toma aire'], ['out', 4, 'Suelta el aire']], defaultMin: 2, kidVisual: 'vela',
    desc: 'Suelta el aire por la nariz tan suave que la llama casi no se mueve.',
  },
  {
    id: 'raton', name: 'Respira como ratón', goal: 'calma', pattern: '3 minutos', profiles: ['peque'],
    phases: [['in', 2, 'Suavecito adentro'], ['out', 2, 'Suavecito afuera']], defaultMin: 3, kidVisual: 'raton',
    desc: 'Respiraciones pequeñitas y suaves por la nariz, como un ratón.',
  },
];

export const byId = (id) => EXERCISES.find((e) => e.id === id);

export function exercisesFor(kind) {
  return EXERCISES.filter((e) => e.profiles.includes(kind));
}

export function nameFor(ex, kind) {
  return kind === 'adulto' ? ex.name : (ex.kidName || ex.name);
}

export function phasesFor(ex, kind) {
  if (kind === 'junior' && ex.juniorPhases) return ex.juniorPhases;
  return ex.phases || [];
}

export const QUICK = [
  { label: 'Enfocarme', id: 'cuadrada', color: '#E2CC94' },
  { label: 'Calmarme', id: 'exhalacion', color: '#6FA58A' },
  { label: 'Dormir', id: '478', color: '#B9DEC3' },
];

export const AMBIENTS = [
  { id: 'bosque', label: 'Bosque al amanecer', detail: 'Música suave + aves', icon: 'leaf' },
  { id: 'lluvia', label: 'Lluvia suave', detail: 'Naturaleza', icon: 'cloud' },
  { id: 'mar', label: 'Mar tranquilo', detail: 'Naturaleza', icon: 'wave' },
  { id: 'silencio', label: 'Silencio', detail: 'Solo tonos', icon: 'mute' },
];

export const DURATIONS = [3, 5, 10, 15, 25];
