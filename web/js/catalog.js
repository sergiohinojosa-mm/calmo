// Catálogo predefinido. Todo se respira por la nariz.
// phases: [tipo, segundos, etiqueta opcional]. Tipos: in, hold, out, wait.
// Los campos kid* son los textos para Junior y Peque: sin tecnicismos.

export const PHASE = {
  in: { label: 'Inhala', kid: 'Toma aire', color: '#B9DEC3', freq: 523.25 },
  hold: { label: 'Retén', kid: 'Guarda el aire', color: '#E2CC94', freq: 440 },
  out: { label: 'Exhala', kid: 'Suelta el aire', color: '#6FA58A', freq: 349.23 },
  wait: { label: 'Espera', kid: 'Espera sin aire', color: '#7C8F84', freq: 293.66 },
};

export const GOALS = {
  equilibrio: { label: 'Equilibrio', color: '#9CC5A1' },
  calma: { label: 'Calma', color: '#6FA58A' },
  enfoque: { label: 'Enfoque', color: '#E2CC94' },
  dormir: { label: 'Dormir', color: '#B9DEC3' },
  bolt: { label: 'BOLT', kidLabel: 'Más aire', color: '#E9DFC4' },
};

export const goalLabel = (goal, kind) => (kind === 'adulto' ? GOALS[goal].label : (GOALS[goal].kidLabel || GOALS[goal].label));

export const EXERCISES = [
  {
    id: 'coherente', name: 'Respiración coherente', kidName: 'Respira como las olas', goal: 'equilibrio', pattern: '5.5 · 5.5',
    profiles: ['adulto', 'junior'], phases: [['in', 5.5], ['out', 5.5]], juniorPhases: [['in', 4], ['out', 4]], defaultMin: 10, juniorMin: 5,
    desc: 'Entre 5 y 6 respiraciones por minuto, suaves y por la nariz. Equilibra tu ritmo y baja el estrés.',
    steps: ['Siéntate erguido y relaja los hombros.', 'Cierra la boca: todo es por la nariz.', 'Inhala suave 5.5 segundos.', 'Exhala sin prisa 5.5 segundos.', 'Respira con el diafragma, sin levantar los hombros.'],
    hints: ['Respira con el diafragma, sin levantar los hombros.', 'Inhala suave, sin llenar del todo.', 'Exhala sin prisa, como una brisa.', 'Hombros sueltos, mandíbula relajada.'],
    kidDesc: 'Respira lento por la nariz, como las olas del mar que van y vienen.',
    kidSteps: ['Siéntate a gusto y cierra la boca.', 'Toma aire despacito por la nariz.', 'Suéltalo despacito por la nariz.', 'Respira con tu diafragma, el músculo que está debajo de tus pulmones.'],
    kidHints: ['Respira con tu diafragma, despacito como una ola.', 'Despacito, sin prisa.', 'Todo por la nariz.'],
    kidPattern: 'Lento, como las olas',
  },
  {
    id: 'exhalacion', name: 'Exhalación larga', kidName: 'Suelta el aire despacito', goal: 'calma', pattern: '5 · 8',
    profiles: ['adulto', 'junior'], phases: [['in', 5], ['out', 8]], juniorPhases: [['in', 4], ['out', 6]], defaultMin: 5, juniorMin: 3,
    desc: 'La exhalación más larga que la inhalación activa la calma del cuerpo.',
    steps: ['Inhala suave por la nariz 5 segundos.', 'Exhala por la nariz, despacio, 8 segundos.', 'Si te cuesta, exhala sin forzar: lo importante es que la exhalación sea más larga.'],
    hints: ['Alarga la exhalación sin forzar.', 'Siente cómo se aflojan los hombros.'],
    kidDesc: 'Suelta el aire más lento de lo que lo tomas. Te ayuda a calmarte.',
    kidSteps: ['Toma aire por la nariz contando 4.', 'Suéltalo por la nariz contando 6, muy despacito.'],
    kidHints: ['Suelta el aire despacito, como una pluma.', 'Afloja los hombros.'],
    kidPattern: 'Toma 4, suelta 6',
  },
  {
    id: 'triangulo', name: 'Triángulo', kidName: 'El triángulo', goal: 'enfoque', pattern: '4 · 4 · 4',
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 4], ['out', 4]], defaultMin: 5, juniorMin: 3,
    desc: 'Una versión sencilla de la respiración cuadrada para enfocarte.',
    steps: ['Inhala por la nariz 4 segundos.', 'Retén suave 4 segundos.', 'Exhala por la nariz 4 segundos.'],
    hints: ['Retén sin apretar.', 'Mantén el ritmo parejo.'],
    kidDesc: 'Tres pasos iguales: tomas aire, lo guardas y lo sueltas. Te ayuda a concentrarte.',
    kidSteps: ['Toma aire por la nariz contando 4.', 'Guárdalo contando 4.', 'Suéltalo por la nariz contando 4.'],
    kidHints: ['Imagina que dibujas un triángulo.', 'Todo por la nariz.'],
    kidPattern: 'Toma 4, guarda 4, suelta 4',
  },
  {
    id: 'cuadrada', name: 'Respiración cuadrada', kidName: 'La caja', goal: 'enfoque', pattern: '4 · 4 · 4 · 4', minBolt: 10,
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 4], ['out', 4], ['wait', 4]], defaultMin: 5, juniorMin: 3,
    desc: 'Cuatro tiempos iguales. Ideal antes de una junta o un examen.',
    steps: ['Inhala por la nariz 4 segundos.', 'Retén 4.', 'Exhala por la nariz 4 segundos.', 'Espera 4 sin tomar aire.'],
    hints: ['Imagina que dibujas un cuadrado.', 'Cada lado dura lo mismo.'],
    kidDesc: 'Cuatro pasos iguales, como los lados de una caja. Ayuda antes de un examen.',
    kidSteps: ['Toma aire por la nariz contando 4.', 'Guárdalo contando 4.', 'Suéltalo por la nariz contando 4.', 'Espera sin tomar aire contando 4.'],
    kidHints: ['Dibuja una caja con tu respiración.', 'Cada lado dura lo mismo.'],
    kidPattern: 'Toma 4, guarda 4, suelta 4, espera 4',
  },
  {
    id: 'alterna', name: 'Respiración alterna', kidName: 'Un lado y el otro', goal: 'equilibrio', pattern: '4 · 4 · 4', alternate: true,
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 4], ['out', 4]], defaultMin: 5, juniorMin: 3,
    desc: 'Alternas la fosa nasal con el dedo. Equilibra y concentra.',
    steps: ['Tapa la fosa derecha con el pulgar e inhala por la izquierda.', 'Tapa ambas y retén.', 'Suelta la derecha y exhala por ese lado.', 'La pantalla te dice qué lado sigue.'],
    hints: ['Mueve solo los dedos, el resto relajado.'],
    kidDesc: 'Respiras por un lado de la nariz y luego por el otro.',
    kidSteps: ['Tapa un lado de la nariz con el dedo y toma aire por el otro.', 'Tapa los dos lados y guarda el aire.', 'Destapa el otro lado y suelta el aire.', 'La pantalla te dice qué lado sigue.'],
    kidHints: ['Solo se mueven tus dedos.'],
    kidPattern: 'Toma 4, guarda 4, suelta 4',
  },
  {
    id: '478', name: '4-7-8', kidName: 'Respira para dormir', goal: 'dormir', pattern: '4 · 7 · 8', minBolt: 10,
    profiles: ['adulto', 'junior'], phases: [['in', 4], ['hold', 7], ['out', 8]], defaultMin: 1, maxMin: 3, juniorMin: 1,
    desc: 'Para conciliar el sueño. Empieza con 4 ciclos (más o menos 1 minuto); después de un mes puedes llegar a 8. Al inicio puede marear un poco: hazlo acostado.',
    steps: ['Inhala 4 por la nariz.', 'Retén 7.', 'Exhala 8 por la nariz, muy despacio.'],
    hints: ['Afloja la cara y la mandíbula.', 'Deja que el cuerpo pese.'],
    kidDesc: 'Para dormir. Hazlo en la cama, con la luz apagada.',
    kidSteps: ['Toma aire por la nariz contando 4.', 'Guárdalo contando 7.', 'Suéltalo por la nariz contando 8, muy despacito.'],
    kidHints: ['Deja que tu cuerpo pese.', 'Afloja la cara.'],
    kidPattern: 'Toma 4, guarda 7, suelta 8',
  },
  {
    id: 'suspiro', name: 'Suspiro cíclico', kidName: 'Dos sorbitos de aire', goal: 'calma', pattern: '2 + 1 · 6',
    // Herramienta puntual para un momento de estrés: no se agenda como rutina.
    profiles: ['adulto', 'junior'], phases: [['in', 2], ['in', 1, 'Un poquito más'], ['out', 6]], defaultMin: 3, maxMin: 5, juniorMin: 2, puntual: true,
    desc: 'Doble inhalación y una exhalación larga, todo por la nariz. Para un momento de estrés; después vuelve a respirar ligero.',
    steps: ['Inhala por la nariz.', 'Toma un poquito más de aire.', 'Exhala largo por la nariz.'],
    hints: ['La segunda inhalación es pequeña.', 'Exhala hasta vaciar sin forzar.'],
    kidDesc: 'Dos sorbitos de aire por la nariz y lo sueltas largo, también por la nariz. Para un momento de nervios o enojo; después respira suavecito.',
    kidSteps: ['Toma aire por la nariz.', 'Toma un sorbito más.', 'Suéltalo largo por la nariz.'],
    kidHints: ['El segundo sorbito es chiquito.', 'Suéltalo largo, sin prisa.'],
    kidPattern: 'Dos sorbitos y suelta largo',
  },
  {
    id: 'destapar', name: 'Destapar la nariz', kidName: 'Destapa tu nariz', goal: 'bolt', pattern: '6 repeticiones', mode: 'destapar', reps: 6,
    profiles: ['adulto', 'junior'], defaultMin: 5,
    desc: 'Para cuando tienes la nariz tapada. Retienes con la nariz cerrada y mueves la cabeza.',
    steps: ['Exhala normal por la nariz.', 'Tapa la nariz y mueve la cabeza arriba y abajo.', 'Cuando sientas falta de aire moderada, suelta y respira calmado por la nariz.', 'Recupera 45 segundos y repite.'],
    kidDesc: 'Para cuando tienes la nariz tapada.',
    kidSteps: ['Suelta el aire normal por la nariz.', 'Tápate la nariz y mueve la cabeza arriba y abajo.', 'Cuando quieras respirar, suelta y respira suavecito por la nariz.', 'Descansa y repite.'],
    kidPattern: '6 veces',
  },
  {
    id: 'ligero', name: 'Respira ligero en reposo', kidName: 'Respira suavecito', goal: 'bolt', pattern: 'Bloques de 4 + 1 min', mode: 'ligero', reduced: true,
    profiles: ['adulto', 'junior'], phases: [['in', 3], ['out', 4]], defaultMin: 10, juniorMin: 5, blockOn: 240, blockOff: 60, juniorBlockOn: 120,
    desc: 'Respiración reducida (Oxygen Advantage): respira por la nariz menos aire, suave y lento, hasta sentir una falta de aire leve y tolerable.',
    steps: ['Siéntate erguido, con los hombros relajados.', 'Respira por la nariz con el diafragma, un poco menos de lo que tu cuerpo pide.', 'Suaviza la respiración hasta que casi no se note.', 'Si la falta de aire es fuerte, respira normal 15 segundos.'],
    hints: ['Respira un poco menos de lo que tu cuerpo pide.', 'Suaviza la respiración hasta que casi no se note.', 'Relaja los hombros y la mandíbula.', 'Si la falta de aire se vuelve fuerte, toca «Necesito aire».'],
    kidDesc: 'Respira suavecito por la nariz, tan bajito que casi no se oiga.',
    kidSteps: ['Siéntate con la espalda recta y cierra la boca.', 'Respira por la nariz, muy suavecito.', 'Tan bajito que casi no se oiga.', 'Si te falta el aire, toca «Necesito aire» y respira normal.'],
    kidHints: ['Suavecito, como un ratón.', 'Tan bajito que casi no se oiga.', 'Afloja los hombros.', 'Si te falta el aire, toca «Necesito aire».'],
    kidPattern: '2 min suavecito y 1 de descanso',
  },
  {
    id: 'pausas', name: 'Respiración reducida con pausas de control', kidName: 'Respira suave y mide', goal: 'bolt', pattern: '3 rondas', mode: 'pausas', reduced: true, minBolt: 10,
    profiles: ['adulto', 'junior'], phases: [['in', 3], ['out', 4]], rounds: 3, reducedSec: 180, defaultMin: 12,
    desc: 'Respiración reducida (Buteyko): mides tu pausa de control, respiras reducido y vuelves a medir para ver cuánto mejoras.',
    steps: ['Mide tu pausa de control: exhala, tapa la nariz y toca al primer deseo de respirar.', 'Recupera 15 segundos.', 'Respira reducido 3 minutos.', 'Mide otra vez. Se repite 3 rondas.'],
    hints: ['Respira un poco menos de lo que tu cuerpo pide.', 'Suave y lento, por la nariz.'],
    kidDesc: 'Mides cuándo te pide aire tu cuerpo, respiras suavecito un rato y vuelves a medir para ver cuánto mejoras.',
    kidSteps: ['Suelta el aire normal y tápate la nariz. Toca cuando quieras respirar.', 'Descansa un poquito.', 'Respira suavecito por la nariz 2 minutos.', 'Vuelve a medir.'],
    kidHints: ['Suavecito, por la nariz.', 'Tan bajito que casi no se oiga.'],
    kidPattern: '3 retos del aire',
  },
  {
    id: 'caminando', name: 'Retenciones caminando', kidName: 'Camina sin respirar', goal: 'bolt', pattern: '6 a 10 · 60 s de recuperación', mode: 'serie',
    profiles: ['adulto', 'junior'], defaultMin: 10,
    desc: 'Simulación de altitud: retienes el aire mientras caminas y recuperas 60 segundos entre cada una.',
    steps: ['Exhala normal y tápate la nariz.', 'Camina contando pasos hasta una falta de aire moderada.', 'Suelta y recupera 60 segundos por la nariz.', 'Repite de 6 a 10 veces.'],
    kidDesc: 'Caminas sin respirar y cuentas tus pasos. Luego descansas 60 segundos.',
    kidSteps: ['Suelta el aire normal y tápate la nariz.', 'Camina y cuenta tus pasos.', 'Cuando quieras respirar, suelta y respira por la nariz.', 'Descansa 60 segundos y repite.'],
    kidPattern: '6 a 10 vueltas y 1 min de descanso',
  },
  {
    id: 'flor', name: 'Huele la flor', goal: 'calma', pattern: '1 minuto', profiles: ['peque'],
    phases: [['in', 3, 'Huele la flor por la nariz'], ['out', 4, 'Suelta el aire por la nariz, despacito']], defaultMin: 1, kidVisual: 'flor',
    desc: 'Huele una flor por la nariz y suelta el aire despacito, también por la nariz.',
  },
  {
    id: 'vela', name: 'La vela tranquila', goal: 'calma', pattern: '2 minutos', profiles: ['peque'],
    phases: [['in', 3, 'Toma aire por la nariz'], ['out', 4, 'Suelta por la nariz, despacito']], defaultMin: 2, kidVisual: 'vela',
    desc: 'Suelta el aire por la nariz tan suave que la llama no se apague.',
  },
  {
    id: 'raton', name: 'Respira como ratón', goal: 'calma', pattern: '3 minutos', profiles: ['peque'],
    phases: [['in', 2, 'Huele suavecito por la nariz'], ['out', 2, 'Suelta suavecito por la nariz']], defaultMin: 3, kidVisual: 'raton',
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

// Textos del ejercicio según el perfil: los de niña o niño no llevan tecnicismos.
export function textsFor(ex, kind) {
  if (kind === 'adulto') {
    return { name: ex.name, desc: ex.desc, steps: ex.steps, hints: ex.hints, pattern: ex.pattern, defaultMin: ex.defaultMin };
  }
  return {
    name: ex.kidName || ex.name,
    desc: ex.kidDesc || ex.desc,
    steps: ex.kidSteps || ex.steps,
    hints: ex.kidHints || ex.hints,
    pattern: ex.kidPattern || ex.pattern,
    defaultMin: (kind === 'junior' && ex.juniorMin) || ex.defaultMin,
  };
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

// Plan según el BOLT de la mañana (Oxygen Advantage): qué conviene practicar en cada etapa.
// Los minutos son sugerencias diarias; la serie caminando no se agenda, se hace desde el ejercicio.
// La falta de aire fuerte en la serie empieza en 20 s (decisión de la maestra).
export const BOLT_PLAN = [
  {
    upTo: 10, title: 'Empieza suave',
    why: 'Con menos de 10 s, lo primero es respirar por la nariz todo el día y respirar ligero, sin retenciones fuertes.',
    items: [
      { id: 'ligero', min: 5, why: 'Un poco menos de aire del que pide tu cuerpo, sin tensarte.' },
      { id: 'exhalacion', min: 5, why: 'Para calmarte y bajar el ritmo.' },
    ],
    habit: 'Nariz día y noche, también al caminar y al dormir.',
  },
  {
    upTo: 20, title: 'Sube tu BOLT',
    why: 'De 10 a 20 s lo que más ayuda es la respiración reducida, todos los días.',
    items: [
      { id: 'ligero', min: 10, why: 'Un poco menos de aire del que pide tu cuerpo, sin tensarte.' },
      { id: 'pausas', why: 'Ves cuánto mejora tu pausa de control en cada sesión.' },
      { id: 'caminando', why: 'Unas 3 veces por semana, con falta de aire moderada.' },
    ],
    habit: 'Mide tu BOLT una vez, al despertar, antes de cualquier actividad.',
  },
  {
    upTo: 30, title: 'Vas bien',
    why: 'De 20 a 30 s ya puedes subir la intensidad de las retenciones.',
    items: [
      { id: 'pausas', why: 'Sigue siendo la base para subir tu BOLT.' },
      { id: 'caminando', why: 'Ya puedes llegar a una falta de aire fuerte.' },
      { id: 'coherente', min: 10, why: 'Para el equilibrio del día.' },
    ],
    habit: 'Haz ejercicio con la boca cerrada; si la necesitas abrir, baja la intensidad.',
  },
  {
    upTo: 40, title: 'Cerca de la meta',
    why: 'De 30 a 40 s, las retenciones caminando y el ejercicio por la nariz te llevan a los 40 s.',
    items: [
      { id: 'caminando', why: 'Con falta de aire fuerte, varias veces por semana.' },
      { id: 'ligero', min: 10, why: 'Para mantener la respiración ligera en el día.' },
      { id: 'coherente', min: 10, why: 'Para el equilibrio del día.' },
    ],
    habit: 'Haz ejercicio con la boca cerrada; si la necesitas abrir, baja la intensidad.',
  },
  {
    upTo: Infinity, title: 'Meta lograda',
    why: 'Con 40 s o más, la tarea es mantener lo logrado.',
    items: [
      { id: 'coherente', min: 10, why: 'Para el equilibrio del día.' },
      { id: 'caminando', why: 'Un par de veces por semana para no perder tolerancia.' },
    ],
    habit: 'Nariz día y noche.',
  },
];

export const boltPlan = (seconds) => BOLT_PLAN.find((b) => seconds < b.upTo);
