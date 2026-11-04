// Insignias: 25 por perfil, las de Peque se ganan con ejercicios de Peque, umbral exacto y +10 hojas una sola vez.
import { reloj, fecha } from './lib/entorno.js';
import { grupo, prueba, fin, verdad, falso, igual, incluye, noIncluye, vacio } from './lib/prueba.js';
import { store, nuevaFamilia, sesion, como, hojasPorInsignia } from './lib/ayudas.js';
import { exercisesFor } from '../../web/js/catalog.js';

const dia = (n, h = 0, m = 0) => fecha(2026, 6, 1 + n, h, m);
const ids = (lista) => lista.map((b) => b.id);

// ---------------------------------------------------------------------------
grupo('Cuántas y cuáles');

prueba('badgesFor da exactamente 25 insignias distintas a adulto, junior y peque', () => {
  const p = nuevaFamilia();
  [['Sergio', 'adulto'], ['Ana', 'junior'], ['Lía', 'peque']].forEach(([nombre, kind]) => {
    const lista = ids(store.badgesFor(p[nombre].id));
    igual(p[nombre].kind, kind);
    igual(lista.length, 25, `${kind}`);
    igual(new Set(lista).size, 25, `${kind}: ids repetidos`);
  });
});

prueba('cada insignia de Peque se puede ganar solo con ejercicios de Peque (más reto del aire y premios)', () => {
  // 35 días de práctica realista: solo ejercicios de Peque para Lía. Sergio practica lo suyo para el reto en familia.
  const p = nuevaFamilia({ conRutinas: true, gente: [{ name: 'Sergio', kind: 'adulto' }, { name: 'Lía', kind: 'peque', age: 5 }] });
  const lia = p['Lía'].id;
  const deLia = exercisesFor('peque').map((e) => e.id);
  verdad(deLia.length > 0, 'no hay ejercicios de Peque');
  const planes = store.routines(lia).filter((r) => r.kind === 'sesion');
  planes.forEach((r) => incluye(deLia, r.exerciseId, `la rutina sugerida de Peque «${r.name}» usa un ejercicio que no es de Peque`));

  for (let n = 0; n < 35; n++) {
    como(lia, () => {
      reloj.en(dia(n, 7, 0)); sesion(deLia[0], reloj.fecha(), 5);
      reloj.en(dia(n, 7, 30)); store.addBolt({ seconds: 20 });
      planes.forEach((r) => { const [h, m] = r.time.split(':').map(Number); reloj.en(dia(n, h, m)); sesion(r.exerciseId, reloj.fecha(), 1); });
      deLia.forEach((ex, k) => { reloj.en(dia(n, 20, 30 + k * 5)); sesion(ex, reloj.fecha(), 2); });
    });
    como(p.Sergio.id, () => { reloj.en(dia(n, 21, 30)); sesion('coherente', reloj.fecha(), 15); });
  }
  // Un premio aprobado.
  const premio = store.rewards().find((r) => r.cost <= store.rewardBalance(lia));
  verdad(premio, 'no alcanza para ningún premio');
  verdad(store.requestReward(premio.id, lia).ok, 'no pudo pedir el premio');
  store.decideRedemption(store.pendingRedemptions().find((r) => r.profile === lia).id, true);

  verdad(store.sessions(lia).every((s) => deLia.includes(s.exerciseId)), 'Lía usó un ejercicio que no es de Peque');
  const faltan = store.badgeStatus(lia).filter((b) => !b.earned).map((b) => `${b.id} (${b.current}/${b.target})`);
  vacio(faltan, 'insignias de Peque que no se pudieron ganar');
});

// ---------------------------------------------------------------------------
grupo('Umbral y hojas');

prueba('se gana justo al llegar al umbral: «primera» con 1 sesión, «diez» con 10 y no con 9', () => {
  const p = nuevaFamilia();
  const r1 = sesion('coherente', dia(0, 10, 0));
  incluye(ids(r1.newBadges), 'primera');
  for (let k = 2; k <= 9; k++) noIncluye(ids(sesion('coherente', dia(0, 10, k)).newBadges), 'diez', `sesión ${k}`);
  falso(store.unlockedBadges(p.Sergio.id).diez, 'con 9 ya estaba ganada');
  incluye(ids(sesion('coherente', dia(0, 10, 10)).newBadges), 'diez', 'sesión 10');
  verdad(store.unlockedBadges(p.Sergio.id).diez);
});

prueba('umbral de BOLT: 14 s no da «aire15», 15 s sí; 19 s no da «aire20», 20 s sí', () => {
  nuevaFamilia();
  noIncluye(ids(store.addBolt({ seconds: 14 }).newBadges), 'aire15');
  incluye(ids(store.addBolt({ seconds: 15 }).newBadges), 'aire15');
  noIncluye(ids(store.addBolt({ seconds: 19 }).newBadges), 'aire20');
  incluye(ids(store.addBolt({ seconds: 20 }).newBadges), 'aire20');
});

prueba('cada insignia da +10 hojas y una sola vez', () => {
  const p = nuevaFamilia();
  const vistas = [];
  for (let n = 0; n < 12; n++) {
    for (const [h, ex] of [[7, 'coherente'], [12, 'cuadrada'], [21, 'ligero'], [22, 'destapar'], [23, 'triangulo']]) {
      reloj.en(dia(n, h));
      const antes = store.points(p.Sergio.id);
      const r = sesion(ex, reloj.fecha(), 12);
      igual(store.points(p.Sergio.id) - antes, r.minutePoints + r.plannedPoints + 10 * r.newBadges.length, `hojas de la sesión ${ex} día ${n}`);
      vistas.push(...ids(r.newBadges));
    }
    const antes = store.points(p.Sergio.id);
    const b = store.addBolt({ seconds: 10 + n });
    igual(store.points(p.Sergio.id) - antes, 10 * b.newBadges.length, `hojas del BOLT día ${n}`);
    vistas.push(...ids(b.newBadges));
  }
  verdad(vistas.length >= 10, `se esperaban varias insignias y llegaron ${vistas.length}`);
  igual(new Set(vistas).size, vistas.length, 'una insignia se dio dos veces');
  igual(hojasPorInsignia(p.Sergio.id), Object.keys(store.unlockedBadges(p.Sergio.id)).length, 'entradas de +10 por insignia');
});

prueba('la insignia de equipo llega una vez a cada quien de la familia', () => {
  const p = nuevaFamilia({ gente: [{ name: 'Sergio', kind: 'adulto' }, { name: 'Ana', kind: 'junior' }] });
  const meta = store.goals(p.Sergio.id).weekly + store.goals(p.Ana.id).weekly;
  for (let n = 0; n < 7; n++) { reloj.en(dia(n, 21)); sesion('coherente', reloj.fecha(), Math.ceil(meta / 6)); }
  verdad(store.unlockedBadges(p.Sergio.id).equipo, 'Sergio sin «equipo»');
  verdad(store.unlockedBadges(p.Ana.id).equipo, 'Ana no recibió «equipo» aunque la familia llegó a la meta');
  for (let n = 7; n < 10; n++) { reloj.en(dia(n, 21)); sesion('coherente', reloj.fecha(), 30); }
  igual(hojasPorInsignia(p.Ana.id), Object.keys(store.unlockedBadges(p.Ana.id)).length, 'Ana recibió +10 más de una vez');
  igual(hojasPorInsignia(p.Sergio.id), Object.keys(store.unlockedBadges(p.Sergio.id)).length);
});

await fin('insignias.prueba.js');
