// Premios: saldo de hojas, pedir (aparta hojas, sin duplicados), «Ahora no» regresa hojas, insignia «premio», el nivel no baja.
import { reloj } from './lib/entorno.js';
import { grupo, prueba, fin, verdad, falso, igual } from './lib/prueba.js';
import { store, nuevaFamilia, hojasPorInsignia } from './lib/ayudas.js';

// Familia con Ana (junior) que ya juntó `hojas`, y dos premios propios de la prueba.
function conHojas(hojas = 200) {
  const p = nuevaFamilia({ gente: [{ name: 'Sergio', kind: 'adulto' }, { name: 'Ana', kind: 'junior' }] });
  store.awardPoints(p.Ana.id, hojas, 'reto');
  store.saveReward({ name: 'Helado de prueba', cost: 80 });
  store.saveReward({ name: 'Bici de prueba', cost: 250 });
  const premio = (nombre) => store.rewards().find((r) => r.name === nombre);
  return { ana: p.Ana.id, helado: premio('Helado de prueba'), bici: premio('Bici de prueba') };
}
const canjeDe = (ana, rewardId) => store.redemptions(ana).find((r) => r.rewardId === rewardId);

grupo('Saldo y pedidos');

prueba('rewardBalance: sin canjes, el saldo son las hojas ganadas', () => {
  const { ana } = conHojas(200);
  igual(store.points(ana), 200);
  igual(store.rewardBalance(ana), 200);
});

prueba('requestReward aparta las hojas en cuanto se pide', () => {
  const { ana, helado } = conHojas(200);
  verdad(store.requestReward(helado.id, ana).ok);
  igual(canjeDe(ana, helado.id).status, 'pendiente');
  igual(store.rewardBalance(ana), 120);
  igual(store.points(ana), 200, 'las hojas ganadas no cambian');
  verdad(store.pendingRedemptions().some((r) => r.profile === ana));
});

prueba('requestReward no deja pedir dos veces el mismo premio mientras está pendiente', () => {
  const { ana, helado } = conHojas(200);
  verdad(store.requestReward(helado.id, ana).ok);
  const otra = store.requestReward(helado.id, ana);
  falso(otra.ok, 'dejó pedirlo dos veces');
  verdad(otra.error, 'sin mensaje de error');
  igual(store.redemptions(ana).length, 1);
  igual(store.rewardBalance(ana), 120);
});

prueba('requestReward no deja pedir sin hojas suficientes ni un premio desactivado', () => {
  const { ana, helado, bici } = conHojas(100);
  falso(store.requestReward(bici.id, ana).ok, 'no alcanza');
  store.saveReward({ id: helado.id, name: helado.name, cost: helado.cost, active: false });
  falso(store.requestReward(helado.id, ana).ok, 'premio desactivado');
  igual(store.redemptions(ana).length, 0);
  igual(store.rewardBalance(ana), 100);
});

grupo('Decisión de papá o mamá');

prueba('«Ahora no» regresa las hojas y se puede volver a pedir', () => {
  const { ana, helado } = conHojas(200);
  store.requestReward(helado.id, ana);
  reloj.avanzarMin(5);
  store.decideRedemption(canjeDe(ana, helado.id).id, false);
  igual(canjeDe(ana, helado.id).status, 'pospuesto');
  igual(store.rewardBalance(ana), 200, 'las hojas regresan');
  verdad(store.requestReward(helado.id, ana).ok, 'no deja volver a pedirlo');
});

prueba('aprobar gana la insignia «premio» (+10 hojas) una sola vez', () => {
  const { ana, helado } = conHojas(300);
  store.requestReward(helado.id, ana);
  store.decideRedemption(canjeDe(ana, helado.id).id, true);
  igual(canjeDe(ana, helado.id).status, 'aprobado');
  verdad(store.unlockedBadges(ana).premio, 'sin insignia «premio»');
  igual(store.points(ana), 310, 'ganadas + 10 de la insignia');
  igual(store.rewardBalance(ana), 230);
  reloj.avanzarMin(5);
  verdad(store.requestReward(helado.id, ana).ok, 'segundo helado');
  store.decideRedemption(store.pendingRedemptions().find((r) => r.profile === ana).id, true);
  igual(store.points(ana), 310, 'la insignia «premio» dio hojas dos veces');
  igual(hojasPorInsignia(ana), Object.keys(store.unlockedBadges(ana)).length);
});

prueba('el nivel no baja al canjear', () => {
  const { ana, bici } = conHojas(260);
  const antes = store.level(ana);
  verdad(antes.index >= 2, `con 260 hojas se esperaba nivel 3 o más y es ${antes.name}`);
  verdad(store.requestReward(bici.id, ana).ok);
  igual(store.level(ana).index, antes.index, 'bajó al pedir');
  store.decideRedemption(canjeDe(ana, bici.id).id, true);
  verdad(store.level(ana).index >= antes.index, `bajó de ${antes.name} a ${store.level(ana).name}`);
  verdad(store.points(ana) >= 260, 'las hojas ganadas bajaron');
  verdad(store.rewardBalance(ana) < 260, 'el saldo para premios sí baja');
});

await fin('premios.prueba.js');
