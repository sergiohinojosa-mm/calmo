// catalog.js: invariantes del método (todo por la nariz, sin «boca/abdomen/pecho/panza»),
// textos para niñas, duraciones coherentes y qué devuelven textsFor/phasesFor.
import './lib/entorno.js';
import { grupo, prueba, conocida, fin, verdad, igual, parecido, incluye, vacio } from './lib/prueba.js';
import { EXERCISES, PHASE, GOALS, textsFor, phasesFor } from '../../web/js/catalog.js';

const PROHIBIDAS = new Set(['boca', 'bocas', 'abdomen', 'abdomenes', 'pecho', 'pechos', 'panza', 'panzas']);
const sinAcentos = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// «Cierra la boca» y «boca cerrada» son la indicación correcta del método (todo por la nariz).
const PERMITIDAS = /cierra la boca|boca cerrada|cerrar la boca/g;
const palabrasProhibidas = (s) => (sinAcentos(s).replace(PERMITIDAS, '').match(/[a-zñ]+/g) || []).filter((w) => PROHIBIDAS.has(w));

// Todos los textos de un objeto con su ruta (desc, steps[2], kidHints[0], phases[1][2], …).
function textos(v, ruta = '', out = []) {
  if (typeof v === 'string') out.push([ruta, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => textos(x, `${ruta}[${i}]`, out));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => textos(x, ruta ? `${ruta}.${k}` : k, out));
  return out;
}
const hallazgos = (obj) => textos(obj).filter(([, t]) => palabrasProhibidas(t).length).map(([r, t]) => `${r}: «${t}»`);

// Fallas conocidas del contenido (ver LEEME.md). Si alguien las corrige, la prueba avisará «ARREGLADA».
const CONOCIDAS_PALABRAS = {};
const CONOCIDAS_NARIZ = {};

const deFamilia = (ex) => ex.profiles.some((k) => k === 'adulto' || k === 'junior');
const etiquetas = (fases) => fases.map((f) => f[2]).filter(Boolean);

// ---------------------------------------------------------------------------
grupo('Sin «boca», «abdomen», «pecho» ni «panza»');

prueba('el catálogo no está vacío y los ids son únicos', () => {
  verdad(EXERCISES.length > 0);
  igual(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});

prueba('etiquetas de fase (PHASE) y de objetivo (GOALS)', () => {
  vacio(hallazgos({ PHASE, GOALS }));
});

EXERCISES.forEach((ex) => {
  const nombre = `«${ex.id}»: ningún texto (desc, steps, hints, kid*, fases) las dice`;
  const fn = () => vacio(hallazgos(ex));
  if (CONOCIDAS_PALABRAS[ex.id]) conocida(nombre, CONOCIDAS_PALABRAS[ex.id], fn);
  else prueba(nombre, fn);
});

// ---------------------------------------------------------------------------
grupo('Todo ejercicio con fases respira por la nariz');

EXERCISES.filter((ex) => (ex.phases || []).length).forEach((ex) => {
  const nombre = `«${ex.id}»: fases válidas y sus textos dicen nariz para cada perfil`;
  const fn = () => {
    const faltan = [];
    [...ex.profiles].forEach((kind) => {
      const fases = phasesFor(ex, kind);
      fases.forEach((f) => {
        incluye(Object.keys(PHASE), f[0], `${kind}: tipo de fase`);
        verdad(Number.isFinite(f[1]) && f[1] > 0, `${kind}: fase de ${f[1]} s`);
      });
      verdad(fases.some((f) => f[0] === 'in') && fases.some((f) => f[0] === 'out'), `${kind}: sin inhalar y exhalar`);
      const t = textsFor(ex, kind);
      const todo = [t.desc, ...(t.steps || []), ...(t.hints || []), ...etiquetas(fases)].join(' ');
      if (!/nariz|nasal/i.test(todo)) faltan.push(kind);
    });
    vacio(faltan, 'perfiles cuyos textos no dicen «nariz»');
  };
  if (CONOCIDAS_NARIZ[ex.id]) conocida(nombre, CONOCIDAS_NARIZ[ex.id], fn);
  else prueba(nombre, fn);
});

// ---------------------------------------------------------------------------
grupo('Textos para niñas');

EXERCISES.filter(deFamilia).forEach((ex) => {
  prueba(`«${ex.id}» (adulto/junior) tiene textos para niñas`, () => {
    const falta = [];
    if (!(typeof ex.kidName === 'string' && ex.kidName.trim())) falta.push('kidName');
    if (!(typeof ex.kidDesc === 'string' && ex.kidDesc.trim())) falta.push('kidDesc');
    if ((ex.steps || []).length && !(ex.kidSteps || []).length) falta.push('kidSteps');
    if ((ex.hints || []).length && !(ex.kidHints || []).length) falta.push('kidHints');
    vacio(falta, 'faltan');
  });
});

// ---------------------------------------------------------------------------
grupo('Duraciones');

prueba('defaultMin, juniorMin y maxMin son coherentes en todo el catálogo', () => {
  const mal = [];
  EXERCISES.forEach((ex) => {
    const max = ex.maxMin ?? Infinity;
    if (!(Number.isFinite(ex.defaultMin) && ex.defaultMin > 0)) mal.push(`${ex.id}: defaultMin ${ex.defaultMin}`);
    if (ex.maxMin !== undefined && !(Number.isFinite(ex.maxMin) && ex.maxMin >= ex.defaultMin)) mal.push(`${ex.id}: maxMin ${ex.maxMin} < defaultMin ${ex.defaultMin}`);
    if (ex.juniorMin !== undefined && !(ex.juniorMin > 0 && ex.juniorMin <= ex.defaultMin && ex.juniorMin <= max)) mal.push(`${ex.id}: juniorMin ${ex.juniorMin}`);
    [...ex.profiles, 'junior'].forEach((kind) => {
      const d = textsFor(ex, kind).defaultMin;
      if (!(d > 0 && d <= max)) mal.push(`${ex.id}/${kind}: textsFor().defaultMin ${d}`);
    });
  });
  vacio(mal);
});

// ---------------------------------------------------------------------------
grupo('textsFor y phasesFor');

prueba('adulto recibe los textos de adulto', () => {
  EXERCISES.forEach((ex) => {
    const t = textsFor(ex, 'adulto');
    igual(t.name, ex.name, `${ex.id}.name`);
    igual(t.desc, ex.desc, `${ex.id}.desc`);
    igual(t.steps, ex.steps, `${ex.id}.steps`);
    igual(t.defaultMin, ex.defaultMin, `${ex.id}.defaultMin`);
    parecido(phasesFor(ex, 'adulto'), ex.phases || [], `${ex.id}: fases`);
  });
});

prueba('junior recibe lo de niñas y lo de junior cuando existe; si no, lo general', () => {
  EXERCISES.forEach((ex) => {
    const t = textsFor(ex, 'junior');
    igual(t.name, ex.kidName || ex.name, `${ex.id}.name`);
    igual(t.desc, ex.kidDesc || ex.desc, `${ex.id}.desc`);
    igual(t.steps, ex.kidSteps || ex.steps, `${ex.id}.steps`);
    igual(t.hints, ex.kidHints || ex.hints, `${ex.id}.hints`);
    igual(t.defaultMin, ex.juniorMin || ex.defaultMin, `${ex.id}.defaultMin`);
    parecido(phasesFor(ex, 'junior'), ex.juniorPhases || ex.phases || [], `${ex.id}: fases`);
  });
  const conFasesJunior = EXERCISES.filter((ex) => ex.juniorPhases);
  verdad(conFasesJunior.length > 0, 'ningún ejercicio tiene fases de junior: la prueba no revisa nada');
  conFasesJunior.forEach((ex) => verdad(phasesFor(ex, 'junior') === ex.juniorPhases && phasesFor(ex, 'adulto') !== ex.juniorPhases, ex.id));
});

prueba('peque usa textos de niñas pero nunca las fases ni minutos de junior', () => {
  EXERCISES.forEach((ex) => {
    parecido(phasesFor(ex, 'peque'), ex.phases || [], `${ex.id}: fases`);
    igual(textsFor(ex, 'peque').defaultMin, ex.defaultMin, `${ex.id}.defaultMin`);
    igual(textsFor(ex, 'peque').desc, ex.kidDesc || ex.desc, `${ex.id}.desc`);
  });
});

await fin('catalogo.prueba.js');
